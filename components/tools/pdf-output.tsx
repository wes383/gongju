"use client";

import * as React from "react";
import { Download, FileArchive, FileCheck2 } from "lucide-react";
import { useCopy } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { downloadBlob, downloadZip, formatBytes } from "@/lib/files";
import { uid } from "@/lib/utils";

export interface PdfOutput {
  id: string;
  name: string;
  blob: Blob;
  url: string;
  /** Extra line, e.g. "3 pages" */
  note?: string;
}

type Draft = Omit<PdfOutput, "id" | "url">;

const COPY = {
  zh: {
    download: "下载",
    empty: "结果会显示在这里",
    zip: "打包下载",
    files: (n: number) => `${n} 个文件`,
  },
  en: {
    download: "Download",
    empty: "Results show up here",
    zip: "Download zip",
    files: (n: number) => `${n} file${n > 1 ? "s" : ""}`,
  },
};

/** Holds generated files and revokes their object URLs when replaced. */
export function usePdfOutputs() {
  const [outputs, setOutputs] = React.useState<PdfOutput[]>([]);
  const urls = React.useRef<string[]>([]);

  const replace = React.useCallback((drafts: Draft[]) => {
    urls.current.forEach((url) => URL.revokeObjectURL(url));
    urls.current = drafts.map((draft) => URL.createObjectURL(draft.blob));
    setOutputs(drafts.map((draft, i) => ({ ...draft, id: uid("out"), url: urls.current[i] })));
  }, []);

  const clear = React.useCallback(() => {
    urls.current.forEach((url) => URL.revokeObjectURL(url));
    urls.current = [];
    setOutputs([]);
  }, []);

  React.useEffect(() => {
    const owned = urls.current;
    return () => {
      owned.forEach((url) => URL.revokeObjectURL(url));
      owned.length = 0;
    };
  }, []);

  return { outputs, replace, clear };
}

export function PdfOutputList({
  outputs,
  zipName = "output.zip",
  empty,
}: {
  outputs: PdfOutput[];
  zipName?: string;
  empty?: string;
}) {
  const t = useCopy(COPY);

  if (outputs.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-surface px-4 py-10 text-center text-sm text-foreground-subtle">
        {empty ?? t.empty}
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <header className="flex h-10 items-center gap-2 border-b border-border px-3">
        <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
          {t.files(outputs.length)}
        </span>
        {outputs.length > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="ml-auto gap-1.5"
            onClick={() => downloadZip(outputs.map((o) => ({ name: o.name, blob: o.blob })), zipName)}
          >
            <FileArchive className="h-3.5 w-3.5" />
            {t.zip}
          </Button>
        )}
      </header>

      <ul>
        {outputs.map((output) => (
          <li
            key={output.id}
            className="flex items-center gap-3 border-b border-border px-3 py-2 last:border-b-0"
          >
            <FileCheck2 className="h-4 w-4 shrink-0 text-foreground-subtle" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-foreground" title={output.name}>
                {output.name}
              </p>
              <p className="text-[11px] text-foreground-subtle">
                {output.note ? `${output.note} · ` : ""}
                {formatBytes(output.blob.size)}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="shrink-0 gap-1.5"
              onClick={() => downloadBlob(output.blob, output.name)}
            >
              <Download className="h-3.5 w-3.5" />
              {t.download}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

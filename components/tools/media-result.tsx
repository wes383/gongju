"use client";

import * as React from "react";
import { Download, FileCheck2 } from "lucide-react";
import { useCopy } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { downloadBlob, formatBytes } from "@/lib/files";

const COPY = {
  zh: { download: "下载", result: "结果" },
  en: { download: "Download", result: "Result" },
};

export function MediaResult({
  blob,
  name,
  kind,
  note,
}: {
  blob: Blob;
  name: string;
  kind: "audio" | "video" | "image";
  note?: string;
}) {
  const t = useCopy(COPY);
  const url = React.useMemo(() => URL.createObjectURL(blob), [blob]);

  React.useEffect(() => {
    return () => URL.revokeObjectURL(url);
  }, [url]);

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface">
      <header className="flex items-center gap-2 border-b border-border px-3 py-2">
        <FileCheck2 className="h-4 w-4 shrink-0 text-foreground-subtle" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-foreground" title={name}>
            {name}
          </p>
          <p className="text-[11px] text-foreground-subtle">
            {formatBytes(blob.size)}
            {note ? ` · ${note}` : ""}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="shrink-0 gap-1.5"
          onClick={() => downloadBlob(blob, name)}
        >
          <Download className="h-3.5 w-3.5" />
          {t.download}
        </Button>
      </header>

      {kind === "audio" ? (
        <audio controls preload="metadata" src={url} className="w-full px-3 py-3" />
      ) : kind === "video" ? (
        <video controls preload="metadata" src={url} className="max-h-[420px] w-full bg-black" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={name}
          className="mx-auto max-h-[420px] max-w-full bg-[repeating-conic-gradient(var(--hover-bg-strong)_0%_25%,transparent_0%_50%)] bg-[length:16px_16px] object-contain"
        />
      )}
    </section>
  );
}

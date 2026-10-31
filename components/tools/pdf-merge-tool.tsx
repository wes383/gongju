"use client";

import * as React from "react";
import { Loader2, Merge } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { useCopy } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PdfDrop, usePdfFiles } from "@/components/tools/pdf-drop";
import { PdfOutputList, usePdfOutputs } from "@/components/tools/pdf-output";
import { OptionBar, OptionField } from "@/components/tools/tool-ui";
import { baseName } from "@/lib/files";
import { savePdf } from "@/lib/pdf";

const COPY = {
  zh: {
    fileName: "文件名",
    run: "开始合并",
    running: "合并中…",
    pages: (n: number) => `${n} 页`,
    note: "按列表顺序拼接，可用右侧箭头调整顺序。全部在浏览器内完成，文件不会上传。",
  },
  en: {
    fileName: "File name",
    run: "Merge",
    running: "Merging…",
    pages: (n: number) => `${n} page${n > 1 ? "s" : ""}`,
    note: "Files are joined in list order — use the arrows to reorder. Everything runs in your browser, nothing is uploaded.",
  },
};

export function PdfMergeTool() {
  const t = useCopy(COPY);
  const { files, add, remove, clear, move, error, loading, setError } = usePdfFiles({
    multiple: true,
  });
  const { outputs, replace } = usePdfOutputs();
  const [name, setName] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const defaultName = files.length > 0 ? `${baseName(files[0].name, "merged")}-merged` : "merged";
  const totalPages = files.reduce((sum, f) => sum + f.pages, 0);

  const run = async () => {
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const out = await PDFDocument.create();
      for (const entry of files) {
        const pages = await out.copyPages(entry.doc, entry.doc.getPageIndices());
        pages.forEach((page) => out.addPage(page));
      }
      const blob = await savePdf(out);
      replace([
        { name: `${(name.trim() || defaultName).replace(/\.pdf$/i, "")}.pdf`, blob, note: t.pages(totalPages) },
      ]);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <PdfDrop
        files={files}
        onAdd={add}
        onRemove={remove}
        onClear={clear}
        onMove={move}
        error={error}
        loading={loading}
        multiple
      />

      {files.length > 0 && (
        <>
          <OptionBar>
            <OptionField label={t.fileName}>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={defaultName}
                aria-label={t.fileName}
                size="xs"
                className="w-56"
              />
            </OptionField>

            <Button
              type="button"
              size="xs"
              onClick={run}
              disabled={busy}
              className="ml-auto gap-1.5"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Merge className="h-3.5 w-3.5" />
              )}
              {busy ? t.running : t.run}
            </Button>
          </OptionBar>


          <PdfOutputList outputs={outputs} zipName="merged.zip" />

          <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
        </>
      )}
    </div>
  );
}

"use client";

import * as React from "react";
import { Loader2, Scissors } from "lucide-react";
import { useCopy } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PdfDrop, usePdfFiles } from "@/components/tools/pdf-drop";
import { PdfOutputList, usePdfOutputs } from "@/components/tools/pdf-output";
import { OptionBar, OptionField } from "@/components/tools/tool-ui";
import { codedError } from "@/lib/errors";
import { baseName } from "@/lib/files";
import { rebuildPdf, savePdf } from "@/lib/pdf";
import { parseRangeGroups, type PageRange } from "@/lib/pdf-pages";

const COPY = {
  zh: {
    mode: "拆分方式",
    byCount: "每 N 页",
    byRange: "按范围",
    count: "每份页数",
    ranges: "页码范围",
    rangesHint: "如 1-3, 5, 8-10",
    run: "开始拆分",
    running: "拆分中…",
    pages: (n: number) => `${n} 页`,
    invalid: "页码范围不合法，请检查是否有超出总页数的编号",
    note: "拆分出的文件各自独立，可直接下载或打包。全部在浏览器内完成，文件不会上传。",
  },
  en: {
    mode: "Split by",
    byCount: "Every N pages",
    byRange: "Page ranges",
    count: "Pages per file",
    ranges: "Ranges",
    rangesHint: "e.g. 1-3, 5, 8-10",
    run: "Split",
    running: "Splitting…",
    pages: (n: number) => `${n} page${n > 1 ? "s" : ""}`,
    invalid: "Invalid ranges — check for page numbers beyond the last page",
    note: "Each part is a standalone PDF you can download individually or as a zip. Everything runs in your browser, nothing is uploaded.",
  },
};

type Mode = "count" | "range";

export function PdfSplitTool() {
  const t = useCopy(COPY);
  const { files, add, remove, clear, error, loading, setError } = usePdfFiles();
  const { outputs, replace } = usePdfOutputs();
  const [mode, setMode] = React.useState<Mode>("count");
  const [count, setCount] = React.useState(1);
  const [ranges, setRanges] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const entry = files[0];
  const total = entry?.pages ?? 0;
  const rangeError = mode === "range" && ranges.trim() !== "" && parseRangeGroups(ranges, total) === null;

  const run = async () => {
    if (!entry) return;
    setBusy(true);
    setError(null);
    try {
      let groups: PageRange[] | null;
      if (mode === "count") {
        const size = Math.max(1, count);
        groups = [];
        for (let start = 1; start <= total; start += size) {
          groups.push({ start, end: Math.min(start + size - 1, total) });
        }
      } else {
        groups = parseRangeGroups(ranges, total);
        if (!groups) throw codedError("pdf.badRange");
      }

      const stem = baseName(entry.name, "document");
      const drafts = [];
      for (const group of groups) {
        const indices: number[] = [];
        for (let page = group.start; page <= group.end; page += 1) indices.push(page - 1);
        const doc = await rebuildPdf(entry.doc, indices);
        const label =
          group.start === group.end ? `p${group.start}` : `p${group.start}-${group.end}`;
        drafts.push({
          name: `${stem}-${label}.pdf`,
          blob: await savePdf(doc),
          note: t.pages(indices.length),
        });
      }
      replace(drafts);
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
        error={error}
        loading={loading}
      />

      {entry && (
        <>
          <OptionBar>
            <OptionField label={t.mode}>
              <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
                <SelectTrigger size="xs" aria-label={t.mode} className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="count">{t.byCount}</SelectItem>
                  <SelectItem value="range">{t.byRange}</SelectItem>
                </SelectContent>
              </Select>
            </OptionField>

            {mode === "count" ? (
              <OptionField label={t.count}>
                <Input
                  type="number"
                  min={1}
                  max={total}
                  value={count}
                  onChange={(e) =>
                    setCount(Math.min(Math.max(Number(e.target.value) || 1, 1), total))
                  }
                  aria-label={t.count}
                  size="xs"
                  className="w-16 text-center font-mono"
                />
              </OptionField>
            ) : (
              <OptionField label={t.ranges}>
                <Input
                  value={ranges}
                  onChange={(e) => setRanges(e.target.value)}
                  placeholder={t.rangesHint}
                  aria-label={t.ranges}
                  size="xs"
                  className="w-52 font-mono"
                />
              </OptionField>
            )}

            <Button
              type="button"
              size="xs"
              onClick={run}
              disabled={busy || rangeError}
              className="ml-auto gap-1.5"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Scissors className="h-3.5 w-3.5" />
              )}
              {busy ? t.running : t.run}
            </Button>
          </OptionBar>

          {rangeError && <p className="text-xs text-red-fg">{t.invalid}</p>}

          <PdfOutputList outputs={outputs} zipName="split.zip" />

          <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
        </>
      )}
    </div>
  );
}

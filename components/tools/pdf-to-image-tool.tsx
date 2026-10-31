"use client";

import * as React from "react";
import { ImageDown, Loader2 } from "lucide-react";
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
import { OutputList, useOutputs } from "@/components/tools/image-output";
import { PdfDrop, usePdfFiles } from "@/components/tools/pdf-drop";
import { OptionBar, OptionField } from "@/components/tools/tool-ui";
import { baseName } from "@/lib/files";
import { canvasToBlob, extensionFor } from "@/lib/image";
import { openForRender, renderPage, type RenderablePdf } from "@/lib/pdf-render";
import { parsePageRanges } from "@/lib/pdf-pages";

const COPY = {
  zh: {
    ranges: "页码",
    rangesHint: "留空 = 全部",
    dpi: "分辨率",
    format: "格式",
    run: "转换",
    running: "渲染中…",
    invalid: "页码范围不合法，请检查是否超出总页数",
    note: "按页面原始尺寸渲染，72 DPI 对应 PDF 的 1:1 尺寸。页数多或 DPI 高时耗时较长，全部在浏览器内完成。",
  },
  en: {
    ranges: "Pages",
    rangesHint: "Empty = all",
    dpi: "Resolution",
    format: "Format",
    run: "Convert",
    running: "Rendering…",
    invalid: "Invalid page range — check for pages beyond the last one",
    note: "Pages render at their native size, 72 DPI being the 1:1 size. Many pages or a high DPI takes a while; everything runs in your browser.",
  },
};

const DPI_OPTIONS = [72, 150, 300];
const FORMATS = [
  { value: "image/png", label: "PNG" },
  { value: "image/jpeg", label: "JPEG" },
] as const;

type Format = (typeof FORMATS)[number]["value"];

export function PdfToImageTool() {
  const t = useCopy(COPY);
  const { files, add, remove, clear, error, loading, setError } = usePdfFiles();
  const { outputs, replace } = useOutputs();
  const [ranges, setRanges] = React.useState("");
  const [dpi, setDpi] = React.useState(150);
  const [format, setFormat] = React.useState<Format>("image/png");
  const [busy, setBusy] = React.useState(false);
  const [loaded, setLoaded] = React.useState<{ id: string; value: RenderablePdf } | null>(null);

  const entry = files[0];
  const total = entry?.pages ?? 0;
  const selection = React.useMemo(
    () => (entry ? parsePageRanges(ranges, total) : null),
    [entry, ranges, total]
  );
  const rangeError = entry != null && selection === null;

  React.useEffect(() => {
    if (!entry) return;

    let cancelled = false;
    let opened: RenderablePdf | null = null;

    (async () => {
      try {
        const bytes = new Uint8Array(await entry.file.arrayBuffer());
        opened = await openForRender(bytes);
        if (cancelled) {
          void opened.destroy();
          return;
        }
        setLoaded({ id: entry.id, value: opened });
      } catch (err) {
        if (!cancelled) setError(err);
      }
    })();

    return () => {
      cancelled = true;
      if (opened) void opened.destroy();
    };
  }, [entry, setError]);

  // A file switch starts a new async load, so the pending one must not be used
  const doc = loaded && loaded.id === entry?.id ? loaded.value : null;

  const run = async () => {
    if (!entry || !doc || !selection) return;
    setBusy(true);
    setError(null);
    try {
      const scale = dpi / 72;
      const stem = baseName(entry.name, "page");
      const drafts = [];

      for (const index of selection) {
        const { canvas, width, height } = await renderPage(doc.doc, index + 1, scale);
        const type = format === "image/jpeg" ? "image/jpeg" : "image/png";
        const blob = await canvasToBlob(canvas, type, 0.92);
        drafts.push({
          name: `${stem}-p${index + 1}.${extensionFor(type)}`,
          blob,
          width,
          height,
          note: `${dpi} DPI`,
        });
        canvas.width = 0;
        canvas.height = 0;
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
            <OptionField label={t.ranges}>
              <Input
                value={ranges}
                onChange={(e) => setRanges(e.target.value)}
                placeholder={t.rangesHint}
                aria-label={t.ranges}
                size="xs"
                className="w-44 font-mono"
              />
            </OptionField>

            <OptionField label={t.dpi}>
              <Select value={String(dpi)} onValueChange={(v) => setDpi(Number(v))}>
                <SelectTrigger size="xs" aria-label={t.dpi} className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DPI_OPTIONS.map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value} DPI
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </OptionField>

            <OptionField label={t.format}>
              <Select value={format} onValueChange={(v) => setFormat(v as Format)}>
                <SelectTrigger size="xs" aria-label={t.format} className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMATS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </OptionField>

            <Button
              type="button"
              size="xs"
              onClick={run}
              disabled={busy || rangeError || !doc}
              className="ml-auto gap-1.5"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ImageDown className="h-3.5 w-3.5" />
              )}
              {busy ? t.running : t.run}
            </Button>
          </OptionBar>

          {rangeError && <p className="text-xs text-red-fg">{t.invalid}</p>}

          <OutputList outputs={outputs} zipName="pages.zip" />

          <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
        </>
      )}
    </div>
  );
}

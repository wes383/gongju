"use client";

import * as React from "react";
import { Download, FileUp, ImageDown, Loader2 } from "lucide-react";
import { ImagePreview } from "@/components/tools/image-drop";
import {
  CopyButton,
  ErrorNote,
  InputArea,
  OptionBar,
  OutputArea,
  Pane,
  Segmented,
  Toggle,
} from "@/components/tools/tool-ui";
import { useCopy } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { downloadBlob } from "@/lib/files";
import {
  formatSvg,
  optimizeSvg,
  rasterizeSvg,
  svgSize,
  SVG_SAMPLE,
  type SvgOptimizeOptions,
} from "@/lib/svg";

const COPY = {
  zh: {
    source: "原始 SVG",
    output: "优化结果",
    preview: "预览",
    comments: "去注释",
    metadata: "去元数据",
    whitespace: "折叠空白",
    numbers: "精简小数",
    png: "导出 PNG",
    pngWidth: "PNG 宽度",
    downloadSvg: "下载 .svg",
    downloadPng: "导出 PNG",
    importSvg: "导入 .svg",
    format: "格式化",
    saved: (before: number, after: number, percent: number) =>
      `${before} → ${after} B（省 ${percent}%）`,
    notSvg: "这段内容里没有 <svg> 标签，请粘贴一个 SVG",
    empty: "先粘贴 SVG 代码",
    pngFailed: "这张 SVG 无法渲染成图片，检查是否缺少 width / height 或 viewBox",
    noSize: "没有读到 SVG 尺寸，无法确定导出比例",
    note: "优化只做安全项：删注释与 metadata、折叠标签间空白、精简超过三位的小数、去掉未使用的 version 与 xlink 命名空间，不会改动图形本身。渲染使用浏览器画布，文件不会上传。",
  },
  en: {
    source: "Source SVG",
    output: "Optimised",
    preview: "Preview",
    comments: "Comments",
    metadata: "Metadata",
    whitespace: "Whitespace",
    numbers: "Decimals",
    png: "Export PNG",
    pngWidth: "PNG width",
    downloadSvg: "Download .svg",
    downloadPng: "Export PNG",
    importSvg: "Import .svg",
    format: "Format",
    saved: (before: number, after: number, percent: number) =>
      `${before} → ${after} B (${percent}% smaller)`,
    notSvg: "No <svg> tag found — paste an SVG document",
    empty: "Paste SVG markup first",
    pngFailed: "This SVG cannot be drawn — check for a width / height or viewBox",
    noSize: "Could not read the SVG size, so the export ratio is unknown",
    note: "The optimiser only does safe things: strip comments and metadata, collapse inter-tag whitespace, trim decimals beyond three places, and drop unused version / xlink declarations. Rendering uses a canvas in your browser; nothing is uploaded.",
  },
};

const DEFAULT_OPTIONS: Required<SvgOptimizeOptions> = {
  removeComments: true,
  removeMetadata: true,
  collapseWhitespace: true,
  shortenNumbers: true,
  removeDefaults: true,
};

export function SvgTool() {
  const t = useCopy(COPY);
  const [source, setSource] = React.useState(SVG_SAMPLE);
  const [options, setOptions] = React.useState(DEFAULT_OPTIONS);
  const [pngWidth, setPngWidth] = React.useState("512");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const result = React.useMemo(() => optimizeSvg(source, options), [source, options]);

  const output = result.ok ? result.output : "";
  const size = React.useMemo(() => svgSize(output || source), [output, source]);

  const preview = React.useMemo(
    () => (output ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(output)}` : ""),
    [output]
  );

  const percent =
    result.ok && result.before > 0
      ? Math.max(0, Math.round((1 - result.after / result.before) * 100))
      : 0;

  const exportPng = async () => {
    if (!output || !size) return;
    setBusy(true);
    setError(null);
    try {
      const width = Number(pngWidth);
      const height = Math.max(1, Math.round((size.height / size.width) * width));
      const blob = await rasterizeSvg(output, { width, height });
      downloadBlob(blob, `image-${width}.png`);
    } catch {
      setError(t.pngFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <OptionBar>
        <Toggle
          checked={options.removeComments}
          onChange={(value) => setOptions((prev) => ({ ...prev, removeComments: value }))}
          label={t.comments}
        />
        <Toggle
          checked={options.removeMetadata}
          onChange={(value) => setOptions((prev) => ({ ...prev, removeMetadata: value }))}
          label={t.metadata}
        />
        <Toggle
          checked={options.collapseWhitespace}
          onChange={(value) => setOptions((prev) => ({ ...prev, collapseWhitespace: value }))}
          label={t.whitespace}
        />
        <Toggle
          checked={options.shortenNumbers}
          onChange={(value) => setOptions((prev) => ({ ...prev, shortenNumbers: value }))}
          label={t.numbers}
        />
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-foreground-muted">{t.pngWidth}</span>
          <Segmented
            ariaLabel={t.pngWidth}
            value={pngWidth}
            onChange={setPngWidth}
            options={[
              { value: "256", label: "256" },
              { value: "512", label: "512" },
              { value: "1024", label: "1024" },
            ]}
          />
        </div>
      </OptionBar>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <Pane
            label={t.source}
            className="border-b border-border lg:border-b-0 lg:border-r"
            actions={
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => fileRef.current?.click()}
                  className="gap-1.5 text-foreground-muted"
                >
                  <FileUp className="h-3.5 w-3.5" />
                  <span>{t.importSvg}</span>
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".svg,image/svg+xml"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    setSource(await file.text());
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => setSource(formatSvg(source))}
                  className="text-foreground-muted"
                >
                  {t.format}
                </Button>
              </>
            }
            footer={<span>{result.ok ? `${result.before} B` : ""}</span>}
          >
            <InputArea
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder={t.empty}
              aria-label={t.source}
            />
          </Pane>

          <Pane
            label={t.output}
            actions={
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  disabled={!output}
                  onClick={() =>
                    downloadBlob(
                      new Blob([output], { type: "image/svg+xml;charset=utf-8" }),
                      "optimized.svg"
                    )
                  }
                  className="gap-1.5 text-foreground-muted"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{t.downloadSvg}</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  disabled={!output || !size || busy}
                  onClick={() => void exportPng()}
                  className="gap-1.5 text-foreground-muted"
                >
                  {busy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ImageDown className="h-3.5 w-3.5" />
                  )}
                  <span>{t.downloadPng}</span>
                </Button>
                <CopyButton value={output} />
              </>
            }
            footer={
              <span>
                {result.ok ? t.saved(result.before, result.after, percent) : ""}
              </span>
            }
          >
            {result.ok ? (
              <OutputArea value={output} />
            ) : (
              <div className="p-3">
                <ErrorNote>{result.message === "notSvg" ? t.notSvg : t.empty}</ErrorNote>
              </div>
            )}
          </Pane>
        </div>
      </div>

      {preview && (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <Pane
            label={t.preview}
            footer={
              <span>
                {size ? `${size.width} × ${size.height}` : t.noSize}
              </span>
            }
          >
            <ImagePreview src={preview} alt={t.preview} height="h-[280px]" />
          </Pane>
        </div>
      )}

      {error && <ErrorNote>{error}</ErrorNote>}

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}

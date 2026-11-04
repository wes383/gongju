"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { useAppTheme } from "@/components/theme-provider";
import { useCopy, useLocale } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import {
  ClearButton,
  CopyButton,
  ErrorNote,
  InputArea,
  Pane,
  PaneButton,
} from "@/components/tools/tool-ui";
import { DARK_THEME, LIGHT_THEME } from "@/lib/chart";
import { downloadBlob } from "@/lib/files";
import { codedError, errorText, safe } from "@/lib/errors";
import { MINDMAP_HEADING_SAMPLE, MINDMAP_SAMPLE, parseOutline, renderMindmapSvg, type MindNode } from "@/lib/mindmap";
import { rasterizeSvg, svgSize } from "@/lib/svg";

const COPY = {
  zh: {
    outline: "大纲",
    preview: "思维导图",
    copySvg: "复制 SVG",
    downloadSvg: "SVG",
    downloadPng: "PNG",
    sampleIndent: "缩进示例",
    sampleHeading: "标题示例",
    hint: "第一行是中心主题，缩进（空格或 Tab）决定层级；也支持 # ## ### 标题语法，每行可加 - 或 * 前缀。",
    nodes: "个节点",
    exportFailed: "导出 PNG 失败，请重试",
  },
  en: {
    outline: "Outline",
    preview: "Mind map",
    copySvg: "Copy SVG",
    downloadSvg: "SVG",
    downloadPng: "PNG",
    sampleIndent: "Indented",
    sampleHeading: "Headings",
    hint: "The first line is the centre topic; indentation (spaces or tabs) sets the depth. Markdown headings also work, and each line may start with - or *.",
    nodes: "nodes",
    exportFailed: "PNG export failed — try again",
  },
};

const subscribeNoop = () => () => {};

function countNodes(node: MindNode): number {
  return 1 + node.children.reduce((sum, child) => sum + countNodes(child), 0);
}

export function MindmapTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const { resolvedTheme } = useAppTheme();
  const mounted = React.useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
  const theme = mounted && resolvedTheme === "dark" ? DARK_THEME : LIGHT_THEME;

  const [input, setInput] = React.useState(MINDMAP_SAMPLE);
  const [exportError, setExportError] = React.useState<unknown>(null);

  const parsed = safe(() => parseOutline(input));
  const rendered = parsed.value
    ? safe(() => renderMindmapSvg(parsed.value as MindNode, { theme }))
    : { value: null, error: null };
  const svg = rendered.value ?? "";
  const dataError = parsed.error ?? rendered.error;

  const downloadSvg = () => {
    if (!svg) return;
    downloadBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), "mindmap.svg");
  };

  const downloadPng = async () => {
    const size = svg ? svgSize(svg) : null;
    if (!svg || !size) return;
    try {
      const scale = Math.min(2, 4000 / Math.max(size.width, size.height));
      const blob = await rasterizeSvg(svg, {
        width: Math.round(size.width * scale),
        height: Math.round(size.height * scale),
        background: theme.background,
      });
      downloadBlob(blob, "mindmap.png");
      setExportError(null);
    } catch {
      setExportError(codedError("chart.exportFailed"));
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <Pane
          label={t.outline}
          actions={
            <>
              <PaneButton onClick={() => setInput(MINDMAP_SAMPLE)}>{t.sampleIndent}</PaneButton>
              <PaneButton onClick={() => setInput(MINDMAP_HEADING_SAMPLE)}>{t.sampleHeading}</PaneButton>
              <ClearButton onClick={() => setInput("")} />
            </>
          }
          footer={
            parsed.value ? (
              <>
                {countNodes(parsed.value as MindNode)} {t.nodes}
              </>
            ) : null
          }
        >
          <InputArea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            spellCheck={false}
            className="min-h-[420px] font-mono"
            placeholder={t.hint}
            aria-label={t.outline}
          />
        </Pane>
      </div>

      <section className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-2.5">
          <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
            {t.preview}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <CopyButton value={svg} label={t.copySvg} />
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="gap-1.5 text-foreground-muted"
              onClick={downloadSvg}
              disabled={!svg}
            >
              <Download className="h-3.5 w-3.5" />
              <span>{t.downloadSvg}</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="gap-1.5 text-foreground-muted"
              onClick={downloadPng}
              disabled={!svg}
            >
              <Download className="h-3.5 w-3.5" />
              <span>{t.downloadPng}</span>
            </Button>
          </div>
        </header>
        <div className="min-h-[420px] flex-1 space-y-3 overflow-auto p-4">
          {dataError ? <ErrorNote>{errorText(dataError, locale)}</ErrorNote> : null}
          {svg ? (
            <div className="[&_svg]:h-auto [&_svg]:max-w-none" dangerouslySetInnerHTML={{ __html: svg }} />
          ) : null}
          {exportError ? <ErrorNote>{errorText(exportError, locale)}</ErrorNote> : null}
        </div>
      </section>
    </div>
  );
}

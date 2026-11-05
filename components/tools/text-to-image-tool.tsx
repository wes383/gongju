"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Download, FileArchive, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ClearButton,
  ErrorNote,
  InputArea,
  OptionBar,
  OptionField,
  SampleButton,
  Segmented,
} from "@/components/tools/tool-ui";
import { canvasFontFamily } from "@/components/tools/canvas-font";
import { useCopy, useLocale } from "@/components/locale-provider";
import { errorText } from "@/lib/errors";
import { downloadBlob, downloadZip } from "@/lib/files";
import {
  SIZE_PRESETS,
  TEXT_THEMES,
  clampEdge,
  clampFont,
  layoutPages,
  parseBlocks,
  textTheme,
  usedHeight,
  type LayoutOptions,
  type PlacedLine,
  type SizePreset,
  type TextTheme,
} from "@/lib/text-image";

const COPY = {
  zh: {
    text: "文字",
    preview: "预览",
    theme: "配色",
    size: "尺寸",
    fontSize: "字号",
    lineHeight: "行高",
    padding: "边距",
    align: "对齐",
    valign: "垂直",
    footer: "署名",
    format: "格式",
    download: "下载当前页",
    downloadAll: (count: number) => `打包下载 ${count} 张`,
    prev: "上一张",
    next: "下一张",
    pageOf: (index: number, total: number) => `第 ${index} / ${total} 张`,
    customW: "宽",
    customH: "高",
    sample: "示例",
    clear: "清空",
    hint: "行首写 # 标题、## 小标题、> 引用、- 列表，其余按原文排版。折行与分页由真实字宽计算，中文标点不会落在行首。",
    note: "图片在本机用 Canvas 绘制，文字不会上传到任何服务器。内容超出一页时按同一版式自动分页，可以逐张下载，也可以打包成 zip 一次拿走。",
    sizes: { story: "竖版", square: "方形", card: "横版", a4: "A4", custom: "自定义" },
    lineHeights: { tight: "紧凑", normal: "正常", loose: "宽松" },
    paddings: { narrow: "窄", normal: "标准", wide: "宽" },
    aligns: { left: "左", center: "中", right: "右" },
    valigns: { top: "顶部", center: "居中" },
    formats: { png: "PNG", jpeg: "JPEG" },
    sampleText: `# 每天十分钟

把一件事拆到「现在就能开始」的大小，然后只做那一件。

> 拖延常常不是懒，而是任务在脑子里太大。

- 写下第一步，越具体越好
- 设一个十分钟的计时器
- 时间到就停手`,
  },
  en: {
    text: "Text",
    preview: "Preview",
    theme: "Palette",
    size: "Size",
    fontSize: "Font size",
    lineHeight: "Leading",
    padding: "Margin",
    align: "Align",
    valign: "Vertical",
    footer: "Signature",
    format: "Format",
    download: "Download page",
    downloadAll: (count: number) => `Download all ${count}`,
    prev: "Previous",
    next: "Next",
    pageOf: (index: number, total: number) => `${index} / ${total}`,
    customW: "Width",
    customH: "Height",
    sample: "Sample",
    clear: "Clear",
    hint: "Start a line with # for a heading, ## for a subheading, > for a quote and - for a list. Wrapping measures real glyph widths, so Chinese punctuation never lands at the start of a line.",
    note: "The image is drawn on a canvas on your device, so the text never reaches a server. Content that overflows is paged with the same layout: download pages one by one, or take them all as a zip.",
    sizes: { story: "Story", square: "Square", card: "Wide", a4: "A4", custom: "Custom" },
    lineHeights: { tight: "Tight", normal: "Normal", loose: "Loose" },
    paddings: { narrow: "Narrow", normal: "Normal", wide: "Wide" },
    aligns: { left: "Left", center: "Center", right: "Right" },
    valigns: { top: "Top", center: "Middle" },
    formats: { png: "PNG", jpeg: "JPEG" },
    sampleText: `# Ten minutes a day

Break the task down until it is small enough to start right now, then do only that.

> Procrastination is rarely laziness. The task is simply too big inside your head.

- Write down the first step, as concrete as you can
- Set a ten minute timer
- Stop when it rings`,
  },
};

type SizeChoice = SizePreset["id"] | "custom";
type Align = "left" | "center" | "right";
type VAlign = "top" | "center";
type LineHeightId = "tight" | "normal" | "loose";
type PaddingId = "narrow" | "normal" | "wide";
type Format = "png" | "jpeg";

const LINE_HEIGHT_VALUES: Record<LineHeightId, number> = {
  tight: 1.35,
  normal: 1.5,
  loose: 1.75,
};

const PADDING_VALUES: Record<PaddingId, number> = { narrow: 48, normal: 96, wide: 144 };

const subscribeNoop = () => () => {};

/**
 * One offscreen context is reused for measuring. It is recreated whenever a
 * webfont finishes loading: browsers cache font metrics per context, so a
 * stale context would keep wrapping against the fallback face.
 */
let measureContext: CanvasRenderingContext2D | null = null;
let measureEpoch = -1;

function measureContextFor(epoch: number): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") return null;
  if (!measureContext || measureEpoch !== epoch) {
    measureContext = document.createElement("canvas").getContext("2d");
    measureEpoch = epoch;
  }
  return measureContext;
}

interface DrawOptions {
  width: number;
  height: number;
  padding: number;
  theme: TextTheme;
  align: Align;
  valign: VAlign;
  footer: string;
  family: string;
  baseSize: number;
  pageIndex: number;
  pageCount: number;
}

function drawPage(canvas: HTMLCanvasElement, page: PlacedLine[], options: DrawOptions) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { width, height, padding, theme, align, valign, family, baseSize } = options;
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, theme.from);
  gradient.addColorStop(1, theme.to);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // A single soft disc keeps a flat gradient from reading as a plain fill
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = theme.accent;
  ctx.beginPath();
  ctx.arc(width * 0.88, height * 0.06, Math.min(width, height) * 0.36, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const contentWidth = width - padding * 2;
  const contentHeight = height - padding * 2;
  const used = usedHeight(page);
  const offset =
    valign === "center" && options.pageCount === 1 && used < contentHeight
      ? Math.round((contentHeight - used) / 2)
      : 0;

  ctx.textBaseline = "top";

  for (const line of page) {
    ctx.font = line.font;
    ctx.fillStyle = line.kind === "quote" ? theme.muted : theme.text;

    const lineWidth = ctx.measureText(line.text).width;
    const room = contentWidth - line.indent;
    const left = padding + line.indent;
    const x =
      align === "center" ? left + (room - lineWidth) / 2 : align === "right" ? left + room - lineWidth : left;
    const top = padding + offset + line.top;

    if (line.rule) {
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = theme.accent;
      ctx.fillRect(
        left - Math.round(line.size * 0.62),
        top + Math.round(line.lineHeight * 0.1),
        Math.max(3, Math.round(line.size * 0.07)),
        Math.round(line.lineHeight * 0.74)
      );
      ctx.restore();
    }

    ctx.fillText(line.text, x, top);
  }

  const footer = options.footer.trim();
  const showCounter = options.pageCount > 1;
  if (!footer && !showCounter) return;

  const footerSize = Math.min(40, Math.max(14, Math.round(baseSize * 0.5)));
  ctx.font = `500 ${footerSize}px ${family}`;
  ctx.fillStyle = theme.muted;
  const footerTop = Math.min(height - footerSize - 6, height - padding + (padding - footerSize) / 2);

  if (footer) {
    // The page counter owns the right edge, so a right-aligned signature flips
    const footerAlign = showCounter && align === "right" ? "left" : align;
    const textWidth = ctx.measureText(footer).width;
    const x =
      footerAlign === "center"
        ? padding + (contentWidth - textWidth) / 2
        : footerAlign === "right"
          ? padding + contentWidth - textWidth
          : padding;
    ctx.fillText(footer, x, footerTop);
  }

  if (showCounter) {
    const label = `${options.pageIndex + 1} / ${options.pageCount}`;
    ctx.fillText(label, padding + contentWidth - ctx.measureText(label).width, footerTop);
  }
}

function toBlob(canvas: HTMLCanvasElement, format: Format): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(
      resolve,
      format === "png" ? "image/png" : "image/jpeg",
      format === "png" ? undefined : 0.92
    );
  });
}

export function TextToImageTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const previewRef = React.useRef<HTMLCanvasElement>(null);

  const [text, setText] = React.useState(t.sampleText);
  const [sizeChoice, setSizeChoice] = React.useState<SizeChoice>("story");
  const [customWidth, setCustomWidth] = React.useState("1080");
  const [customHeight, setCustomHeight] = React.useState("1920");
  const [themeId, setThemeId] = React.useState<TextTheme["id"]>("paper");
  const [fontInput, setFontInput] = React.useState("44");
  const [lineHeightId, setLineHeightId] = React.useState<LineHeightId>("normal");
  const [paddingId, setPaddingId] = React.useState<PaddingId>("normal");
  const [align, setAlign] = React.useState<Align>("left");
  const [valign, setValign] = React.useState<VAlign>("top");
  const [footer, setFooter] = React.useState("");
  const [format, setFormat] = React.useState<Format>("png");
  const [page, setPage] = React.useState(0);

  // Server rendering cannot measure glyphs, so the layout only runs on the client
  const isClient = React.useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );

  const [fontEpoch, setFontEpoch] = React.useState(0);
  React.useEffect(() => {
    if (typeof document === "undefined" || !document.fonts) return;
    let cancelled = false;
    const settle = () => {
      if (!cancelled) setFontEpoch((value) => value + 1);
    };
    void document.fonts.ready.then(settle);
    document.fonts.addEventListener("loadingdone", settle);
    return () => {
      cancelled = true;
      document.fonts.removeEventListener("loadingdone", settle);
    };
  }, []);

  const preset = SIZE_PRESETS.find((item) => item.id === sizeChoice);
  const width = preset ? preset.width : clampEdge(Number.parseInt(customWidth, 10), 1080);
  const height = preset ? preset.height : clampEdge(Number.parseInt(customHeight, 10), 1920);
  const padding = PADDING_VALUES[paddingId];
  const baseSize = clampFont(Number.parseInt(fontInput, 10));
  const lineHeight = LINE_HEIGHT_VALUES[lineHeightId];
  const theme = textTheme(themeId);

  const contentWidth = Math.max(40, width - padding * 2);
  const contentHeight = Math.max(40, height - padding * 2);

  const layout = React.useMemo(() => {
    if (!isClient) return { pages: [] as PlacedLine[][], failure: null as unknown };
    const context = measureContextFor(fontEpoch);
    const family = canvasFontFamily(document.body);
    const options: LayoutOptions = {
      size: baseSize,
      lineHeight,
      width: contentWidth,
      height: contentHeight,
      fontFamily: family,
    };

    try {
      const measure = (value: string, font: string) => {
        if (!context) return value.length * baseSize * 0.6;
        context.font = font;
        return context.measureText(value).width;
      };
      return { pages: layoutPages(parseBlocks(text), options, measure), failure: null };
    } catch (error) {
      return { pages: [] as PlacedLine[][], failure: error };
    }
  }, [isClient, fontEpoch, text, baseSize, lineHeight, contentWidth, contentHeight]);

  const pageCount = layout.pages.length;
  // Editing can shorten the document while a later page is open
  const activePage = Math.min(page, Math.max(0, pageCount - 1));
  const family = isClient ? canvasFontFamily(document.body) : "system-ui, sans-serif";

  React.useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas) return;
    drawPage(canvas, layout.pages[activePage] ?? [], {
      width,
      height,
      padding,
      theme,
      align,
      valign,
      footer,
      family,
      baseSize,
      pageIndex: activePage,
      pageCount,
    });
  }, [
    layout.pages,
    activePage,
    pageCount,
    width,
    height,
    padding,
    theme,
    align,
    valign,
    footer,
    family,
    baseSize,
  ]);

  const filename = (index: number) =>
    `text-image-${width}x${height}-${index + 1}.${format === "png" ? "png" : "jpg"}`;

  const download = () => {
    const canvas = previewRef.current;
    if (!canvas) return;
    void toBlob(canvas, format).then((blob) => {
      if (blob) downloadBlob(blob, filename(activePage));
    });
  };

  const downloadAll = async () => {
    const scratch = document.createElement("canvas");
    const files: { name: string; blob: Blob }[] = [];

    for (let index = 0; index < layout.pages.length; index += 1) {
      drawPage(scratch, layout.pages[index], {
        width,
        height,
        padding,
        theme,
        align,
        valign,
        footer,
        family,
        baseSize,
        pageIndex: index,
        pageCount,
      });
      const blob = await toBlob(scratch, format);
      if (blob) files.push({ name: filename(index), blob });
    }

    if (files.length === 1) downloadBlob(files[0].blob, files[0].name);
    else if (files.length > 1) await downloadZip(files, `text-image-${width}x${height}.zip`);
  };

  const failure = layout.failure;

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <OptionField label={t.theme}>
          <Segmented
            ariaLabel={t.theme}
            value={themeId}
            onChange={setThemeId}
            options={TEXT_THEMES.map((item) => ({ value: item.id, label: item.label[locale] }))}
          />
        </OptionField>
        <OptionField label={t.size}>
          <Segmented
            ariaLabel={t.size}
            value={sizeChoice}
            onChange={setSizeChoice}
            options={[
              ...SIZE_PRESETS.map((item) => ({ value: item.id as SizeChoice, label: t.sizes[item.id] })),
              { value: "custom" as SizeChoice, label: t.sizes.custom },
            ]}
          />
        </OptionField>
        <OptionField label={t.align}>
          <Segmented
            ariaLabel={t.align}
            value={align}
            onChange={setAlign}
            options={[
              { value: "left" as Align, label: t.aligns.left },
              { value: "center" as Align, label: t.aligns.center },
              { value: "right" as Align, label: t.aligns.right },
            ]}
          />
        </OptionField>
        <OptionField label={t.valign}>
          <Segmented
            ariaLabel={t.valign}
            value={valign}
            onChange={setValign}
            options={[
              { value: "top" as VAlign, label: t.valigns.top },
              { value: "center" as VAlign, label: t.valigns.center },
            ]}
          />
        </OptionField>
      </OptionBar>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          <label className="flex flex-col gap-1.5">
            <span className="flex items-center justify-between text-[11px] text-foreground-muted">
              {t.text}
              <span className="font-mono text-foreground-faint">{text.length}</span>
            </span>
            <InputArea
              value={text}
              onChange={(event) => setText(event.target.value)}
              aria-label={t.text}
              spellCheck={false}
              className="min-h-[240px] text-[13px] leading-relaxed"
            />
          </label>

          {sizeChoice === "custom" && (
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] text-foreground-muted">{t.customW}</span>
                <Input
                  value={customWidth}
                  onChange={(event) => setCustomWidth(event.target.value)}
                  inputMode="numeric"
                  size="xs"
                  aria-label={t.customW}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] text-foreground-muted">{t.customH}</span>
                <Input
                  value={customHeight}
                  onChange={(event) => setCustomHeight(event.target.value)}
                  inputMode="numeric"
                  size="xs"
                  aria-label={t.customH}
                />
              </label>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] text-foreground-muted">{t.fontSize}</span>
              <Input
                value={fontInput}
                onChange={(event) => setFontInput(event.target.value)}
                inputMode="numeric"
                size="xs"
                aria-label={t.fontSize}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] text-foreground-muted">{t.footer}</span>
              <Input
                value={footer}
                onChange={(event) => setFooter(event.target.value)}
                size="xs"
                placeholder="—"
                aria-label={t.footer}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <OptionField label={t.lineHeight}>
              <Segmented
                ariaLabel={t.lineHeight}
                value={lineHeightId}
                onChange={setLineHeightId}
                options={[
                  { value: "tight" as LineHeightId, label: t.lineHeights.tight },
                  { value: "normal" as LineHeightId, label: t.lineHeights.normal },
                  { value: "loose" as LineHeightId, label: t.lineHeights.loose },
                ]}
              />
            </OptionField>
            <OptionField label={t.padding}>
              <Segmented
                ariaLabel={t.padding}
                value={paddingId}
                onChange={setPaddingId}
                options={[
                  { value: "narrow" as PaddingId, label: t.paddings.narrow },
                  { value: "normal" as PaddingId, label: t.paddings.normal },
                  { value: "wide" as PaddingId, label: t.paddings.wide },
                ]}
              />
            </OptionField>
          </div>

          <div className="flex items-center gap-1">
            <SampleButton onClick={() => setText(t.sampleText)} label={t.sample} />
            <ClearButton onClick={() => setText("")} label={t.clear} />
          </div>
          <p className="text-[11px] leading-relaxed text-foreground-subtle">{t.hint}</p>
        </section>

        <section className="flex min-w-0 flex-col gap-3">
          <div className="flex items-center justify-center overflow-hidden rounded-lg border border-border bg-surface p-3">
            <canvas
              ref={previewRef}
              width={width}
              height={height}
              aria-label={t.preview}
              className="mx-auto block h-auto max-h-[68vh] w-auto max-w-full rounded-md"
            />
          </div>

          {failure ? (
            <ErrorNote>{errorText(failure, locale)}</ErrorNote>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {pageCount > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => setPage(Math.max(0, activePage - 1))}
                    disabled={activePage === 0}
                    aria-label={t.prev}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="px-1 font-mono text-[11px] text-foreground-subtle">
                    {t.pageOf(activePage + 1, pageCount)}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => setPage(Math.min(pageCount - 1, activePage + 1))}
                    disabled={activePage >= pageCount - 1}
                    aria-label={t.next}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              <Segmented
                ariaLabel={t.format}
                value={format}
                onChange={setFormat}
                options={[
                  { value: "png" as Format, label: t.formats.png },
                  { value: "jpeg" as Format, label: t.formats.jpeg },
                ]}
                className="ml-auto"
              />

              <Button type="button" size="sm" className="gap-1.5" onClick={download}>
                <Download className="h-4 w-4" />
                {t.download}
              </Button>

              {pageCount > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void downloadAll()}
                >
                  <FileArchive className="h-4 w-4" />
                  {t.downloadAll(pageCount)}
                </Button>
              )}
            </div>
          )}

          <div className="flex items-start gap-1.5 px-1 text-[11px] leading-relaxed text-foreground-subtle">
            <ImageIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              <span className="font-mono text-foreground-faint">
                {width} × {height}
              </span>{" "}
              · {t.note}
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}

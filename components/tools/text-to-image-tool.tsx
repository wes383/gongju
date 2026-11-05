"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileArchive,
  ImageIcon,
  TriangleAlert,
} from "lucide-react";
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
  autoHeightCap,
  clampEdge,
  clampFont,
  clampLineHeight,
  clampPadding,
  layoutPages,
  layoutSingle,
  normalizeHex,
  parseBlocks,
  solidTheme,
  textTheme,
  usedHeight,
  type LayoutOptions,
  type ParseMode,
  type PlacedLine,
  type SizePreset,
  type ThemeColors,
  type ThemeId,
} from "@/lib/text-image";

const COPY = {
  zh: {
    text: "文字",
    preview: "预览",
    theme: "配色",
    background: "背景",
    bgColor: "背景色",
    parse: "解析",
    size: "尺寸",
    mode: "输出",
    fontSize: "字号",
    lineHeight: "行高",
    padding: "边距",
    align: "对齐",
    valign: "垂直",
    footer: "署名",
    format: "格式",
    download: "下载图片",
    downloadAll: (count: number) => `打包下载 ${count} 张`,
    prev: "上一张",
    next: "下一张",
    pageOf: (index: number, total: number) => `第 ${index} / ${total} 张`,
    customW: "宽",
    customH: "高",
    custom: "自定义",
    customLineHeight: "自定义行高",
    customPadding: "自定义边距",
    lineHeightUnit: "倍字号",
    paddingUnit: "px",
    sample: "示例",
    clear: "清空",
    hint: "行首写 # 标题、## 小标题、> 引用、- 列表，其余按原文排版；切到纯文本则原样输出，标记不再生效。一张图只需设置宽度（200–4000），高度跟着内容走；分页模式选固定尺寸，含 A4。",
    note: "图片在本机用 Canvas 绘制，文字不会上传到任何服务器。内容超出一页时按同一版式自动分页，可以逐张下载，也可以打包成 zip 一次拿走。",
    width: "宽度",
    lineHeights: { xTight: "很紧", tight: "紧凑", normal: "标准", loose: "宽松", xLoose: "很宽" },
    paddings: { xNarrow: "极窄", narrow: "窄", normal: "标准", wide: "宽", xWide: "很宽" },
    aligns: { left: "左", center: "中", right: "右" },
    valigns: { top: "顶部", center: "居中" },
    formats: { png: "PNG", jpeg: "JPEG" },
    modes: { single: "一张图", pages: "分页" },
    backgrounds: { gradient: "渐变", solid: "纯色" },
    parses: { smart: "Markdown", plain: "纯文本" },
    shrinkNote: (size: number) => `这个字号放不下，已自动缩到 ${size}px，文字仍全部保留`,
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
    background: "Background",
    bgColor: "Colour",
    parse: "Markup",
    size: "Size",
    mode: "Output",
    fontSize: "Font size",
    lineHeight: "Leading",
    padding: "Margin",
    align: "Align",
    valign: "Vertical",
    footer: "Signature",
    format: "Format",
    download: "Download image",
    downloadAll: (count: number) => `Download all ${count}`,
    prev: "Previous",
    next: "Next",
    pageOf: (index: number, total: number) => `${index} / ${total}`,
    customW: "Width",
    customH: "Height",
    custom: "Custom",
    customLineHeight: "Custom leading",
    customPadding: "Custom margin",
    lineHeightUnit: "× font size",
    paddingUnit: "px",
    sample: "Sample",
    clear: "Clear",
    hint: "Start a line with # for a heading, ## for a subheading, > for a quote and - for a list; plain text keeps those markers literal. In one-image mode you only set the width (200–4000) and the height follows the content; paged mode uses a fixed size, A4 included.",
    note: "The image is drawn on a canvas on your device, so the text never reaches a server. Content that overflows is paged with the same layout: download pages one by one, or take them all as a zip.",
    width: "Width",
    lineHeights: { xTight: "Tightest", tight: "Tight", normal: "Normal", loose: "Loose", xLoose: "Loosest" },
    paddings: { xNarrow: "Tiny", narrow: "Narrow", normal: "Normal", wide: "Wide", xWide: "Huge" },
    aligns: { left: "Left", center: "Center", right: "Right" },
    valigns: { top: "Top", center: "Middle" },
    formats: { png: "PNG", jpeg: "JPEG" },
    modes: { single: "One image", pages: "Pages" },
    backgrounds: { gradient: "Gradient", solid: "Solid" },
    parses: { smart: "Markdown", plain: "Plain text" },
    shrinkNote: (size: number) => `That size did not fit, so the type was scaled to ${size}px — nothing is cut`,
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
type LineHeightId = "xTight" | "tight" | "normal" | "loose" | "xLoose";
type PaddingId = "xNarrow" | "narrow" | "normal" | "wide" | "xWide";
type LineHeightChoice = LineHeightId | "custom";
type PaddingChoice = PaddingId | "custom";
type Format = "png" | "jpeg";
type BackgroundMode = "gradient" | "solid";

/** A spread wide enough to cover paper, pastel and ink backgrounds */
const SOLID_SWATCHES = [
  "#ffffff",
  "#f7f5f0",
  "#fef3c7",
  "#f0f9ff",
  "#f0fdf4",
  "#fdf2f8",
  "#111827",
  "#1f2937",
  "#134e4a",
  "#3b0764",
  "#7f1d1d",
];

/** Plain white: the least opinionated background to start from */
const DEFAULT_SOLID = "#ffffff";

interface LayoutResult {
  pages: PlacedLine[][];
  failure: unknown;
  /** Full canvas height, padding included */
  imageHeight: number;
  /** Body size actually used after any auto-shrink */
  usedSize: number;
  shrunk: boolean;
}

const LINE_HEIGHT_VALUES: Record<LineHeightId, number> = {
  xTight: 1.2,
  tight: 1.35,
  normal: 1.5,
  loose: 1.7,
  xLoose: 1.9,
};

const PADDING_VALUES: Record<PaddingId, number> = {
  xNarrow: 28,
  narrow: 56,
  normal: 96,
  wide: 150,
  xWide: 210,
};

/** Chip order: the records above are lookups, this is the reading order */
const LINE_HEIGHT_IDS: LineHeightId[] = ["xTight", "tight", "normal", "loose", "xLoose"];
const PADDING_IDS: PaddingId[] = ["xNarrow", "narrow", "normal", "wide", "xWide"];

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
  theme: ThemeColors;
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

  if (theme.from === theme.to) {
    // Solid background: one colour is what was asked for, so no gradient or disc
    ctx.fillStyle = theme.from;
    ctx.fillRect(0, 0, width, height);
  } else {
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
  }

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

/**
 * A blurred size field reports the number the canvas would really use, so the
 * box never shows 9000 while the image is drawn at the ceiling.
 */
function edgeText(value: string, fallback: number): string {
  return String(clampEdge(Number.parseInt(value, 10), fallback));
}

/** Preset rows (size, leading, margin) carry numbers, so the chip has to wrap freely */
function chip(active: boolean): string {
  return active
    ? "rounded-full border border-accent bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-fg transition-colors"
    : "rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-foreground-muted transition-colors hover:bg-hover-bg hover:text-foreground";
}

/** Decimal fields accept a comma separator, since some keyboards only offer one */
function decimal(value: string): number {
  return Number.parseFloat(value.replace(",", "."));
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
  const [single, setSingle] = React.useState(true);
  const [singleWidth, setSingleWidth] = React.useState("1080");
  const [customWidth, setCustomWidth] = React.useState("1080");
  const [customHeight, setCustomHeight] = React.useState("1920");
  const [themeId, setThemeId] = React.useState<ThemeId>("paper");
  const [bgMode, setBgMode] = React.useState<BackgroundMode>("gradient");
  const [bgColor, setBgColor] = React.useState(DEFAULT_SOLID);
  const [bgHex, setBgHex] = React.useState(DEFAULT_SOLID);
  const [parseMode, setParseMode] = React.useState<ParseMode>("smart");
  const [fontInput, setFontInput] = React.useState("44");
  /** Size the auto-shrink settled on, kept after the field is rewritten to it */
  const [autoSize, setAutoSize] = React.useState<number | null>(null);
  const [fontFocused, setFontFocused] = React.useState(false);
  const [lineHeightId, setLineHeightId] = React.useState<LineHeightChoice>("normal");
  const [customLineHeight, setCustomLineHeight] = React.useState("1.5");
  const [paddingId, setPaddingId] = React.useState<PaddingChoice>("normal");
  const [customPadding, setCustomPadding] = React.useState("96");
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
  const padding =
    paddingId === "custom" ? clampPadding(Number.parseInt(customPadding, 10)) : PADDING_VALUES[paddingId];
  const baseSize = clampFont(Number.parseInt(fontInput, 10));
  const lineHeight =
    lineHeightId === "custom" ? clampLineHeight(decimal(customLineHeight)) : LINE_HEIGHT_VALUES[lineHeightId];

  // One image means one width: the height is whatever the text needs
  const frameWidth = single
    ? clampEdge(Number.parseInt(singleWidth, 10), 1080)
    : preset
      ? preset.width
      : clampEdge(Number.parseInt(customWidth, 10), 1080);
  const frameHeight = preset ? preset.height : clampEdge(Number.parseInt(customHeight, 10), 1920);
  const theme = React.useMemo<ThemeColors>(
    () => (bgMode === "solid" ? solidTheme(bgColor) : textTheme(themeId)),
    [bgMode, bgColor, themeId]
  );

  const contentWidth = Math.max(40, frameWidth - padding * 2);
  const frameContentHeight = Math.max(40, frameHeight - padding * 2);

  const layout = React.useMemo<LayoutResult>(() => {
    const empty: LayoutResult = {
      pages: [],
      failure: null,
      imageHeight: frameHeight,
      usedSize: baseSize,
      shrunk: false,
    };
    if (!isClient) return empty;

    const context = measureContextFor(fontEpoch);
    const options: LayoutOptions = {
      size: baseSize,
      lineHeight,
      width: contentWidth,
      height: frameContentHeight,
      fontFamily: canvasFontFamily(document.body, "--font-inter"),
    };
    const measure = (value: string, font: string) => {
      if (!context) return value.length * baseSize * 0.6;
      context.font = font;
      return context.measureText(value).width;
    };

    try {
      const blocks = parseBlocks(text, parseMode);
      if (single) {
        // The text decides the height; only the canvas ceiling forces a shrink
        const cap = Math.max(120, autoHeightCap(frameWidth) - padding * 2);
        const result = layoutSingle(blocks, options, measure, cap);
        return {
          pages: [result.lines],
          failure: null,
          imageHeight: Math.max(padding * 2 + result.height, padding * 2 + result.size),
          usedSize: result.size,
          shrunk: result.shrunk,
        };
      }
      return {
        pages: layoutPages(blocks, options, measure),
        failure: null,
        imageHeight: frameHeight,
        usedSize: baseSize,
        shrunk: false,
      };
    } catch (error) {
      return { ...empty, failure: error };
    }
  }, [
    isClient,
    fontEpoch,
    text,
    baseSize,
    lineHeight,
    contentWidth,
    frameContentHeight,
    frameWidth,
    frameHeight,
    padding,
    single,
    parseMode,
  ]);

  const pageCount = layout.pages.length;
  // Editing can shorten the document while a later page is open
  const activePage = Math.min(page, Math.max(0, pageCount - 1));
  const family = isClient
    ? canvasFontFamily(document.body, "--font-inter")
    : "system-ui, sans-serif";

  /**
   * Report the size the shrink actually used back into the field, so it never
   * claims a size the image is not drawn at. The one exception is a field with
   * focus: replacing the number mid-keystroke makes a multi-digit size
   * impossible to type, so the write waits for the blur.
   */
  React.useEffect(() => {
    if (!layout.shrunk) return;
    // Deferred by a tick: writing state straight from an effect re-renders in a
    // loop the lint rule quite rightly refuses
    const id = setTimeout(() => {
      setAutoSize(layout.usedSize);
      if (!fontFocused) setFontInput(String(layout.usedSize));
    }, 0);
    return () => clearTimeout(id);
  }, [layout.shrunk, layout.usedSize, fontFocused]);

  React.useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas) return;
    drawPage(canvas, layout.pages[activePage] ?? [], {
      width: frameWidth,
      height: layout.imageHeight,
      padding,
      theme,
      align,
      valign,
      footer,
      family,
      // The footer scales off the body size, so it follows any auto-shrink
      baseSize: layout.usedSize,
      pageIndex: activePage,
      pageCount,
    });
  }, [
    layout.pages,
    layout.imageHeight,
    layout.usedSize,
    activePage,
    pageCount,
    frameWidth,
    padding,
    theme,
    align,
    valign,
    footer,
    family,
  ]);

  const filename = (index: number) =>
    `text-image-${frameWidth}x${layout.imageHeight}-${index + 1}.${format === "png" ? "png" : "jpg"}`;

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
        width: frameWidth,
        height: layout.imageHeight,
        padding,
        theme,
        align,
        valign,
        footer,
        family,
        baseSize: layout.usedSize,
        pageIndex: index,
        pageCount,
      });
      const blob = await toBlob(scratch, format);
      if (blob) files.push({ name: filename(index), blob });
    }

    if (files.length === 1) downloadBlob(files[0].blob, files[0].name);
    else if (files.length > 1)
      await downloadZip(files, `text-image-${frameWidth}x${layout.imageHeight}.zip`);
  };

  const pickColor = (color: string) => {
    setBgColor(color);
    setBgHex(color);
  };

  const editHex = (value: string) => {
    setBgHex(value);
    const normalized = normalizeHex(value);
    if (normalized) setBgColor(normalized);
  };

  /** Custom starts from the value on screen, so picking it does not jump the layout */
  const pickLineHeight = (value: LineHeightChoice) => {
    if (value === "custom") setCustomLineHeight(String(lineHeight));
    setLineHeightId(value);
  };

  const pickPadding = (value: PaddingChoice) => {
    if (value === "custom") setCustomPadding(String(padding));
    setPaddingId(value);
  };

  /** Editing the copy retires the last shrink notice: it described other text */
  const updateText = (value: string) => {
    setAutoSize(null);
    setText(value);
  };

  const failure = layout.failure;

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <OptionField label={t.mode}>
          <Segmented
            ariaLabel={t.mode}
            value={single ? "single" : "pages"}
            onChange={(value) => setSingle(value === "single")}
            options={[
              { value: "single", label: t.modes.single },
              { value: "pages", label: t.modes.pages },
            ]}
          />
        </OptionField>
        <OptionField label={t.background}>
          <Segmented
            ariaLabel={t.background}
            value={bgMode}
            onChange={setBgMode}
            options={[
              { value: "gradient" as BackgroundMode, label: t.backgrounds.gradient },
              { value: "solid" as BackgroundMode, label: t.backgrounds.solid },
            ]}
          />
        </OptionField>
        <OptionField label={t.parse}>
          <Segmented
            ariaLabel={t.parse}
            value={parseMode}
            onChange={setParseMode}
            options={[
              { value: "smart" as ParseMode, label: t.parses.smart },
              { value: "plain" as ParseMode, label: t.parses.plain },
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
        {!single && (
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
        )}
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
              onChange={(event) => updateText(event.target.value)}
              aria-label={t.text}
              spellCheck={false}
              className="min-h-[240px] text-[13px] leading-relaxed"
            />
          </label>

          {bgMode === "solid" ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] text-foreground-muted">{t.bgColor}</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {SOLID_SWATCHES.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={color}
                    aria-pressed={bgColor === color}
                    onClick={() => pickColor(color)}
                    style={{ backgroundColor: color }}
                    className={
                      bgColor === color
                        ? "h-6 w-6 rounded-full border-2 border-accent"
                        : "h-6 w-6 rounded-full border border-border-strong transition-transform hover:scale-110"
                    }
                  />
                ))}
                <Input
                  value={bgHex}
                  onChange={(event) => editHex(event.target.value)}
                  onBlur={() => setBgHex(bgColor)}
                  size="xs"
                  spellCheck={false}
                  aria-label={t.bgColor}
                  className="w-24 font-mono"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] text-foreground-muted">{t.theme}</span>
              <Segmented
                ariaLabel={t.theme}
                value={themeId}
                onChange={setThemeId}
                options={TEXT_THEMES.map((item) => ({ value: item.id, label: item.label[locale] }))}
              />
            </div>
          )}

          {single ? (
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] text-foreground-muted">{t.width}</span>
              <Input
                value={singleWidth}
                onChange={(event) => setSingleWidth(event.target.value)}
                onBlur={() => setSingleWidth(edgeText(singleWidth, 1080))}
                inputMode="numeric"
                size="xs"
                placeholder="1080"
                aria-label={t.width}
              />
            </label>
          ) : (
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] text-foreground-muted">{t.size}</span>
              <div className="flex flex-wrap gap-1.5">
                {SIZE_PRESETS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={sizeChoice === item.id}
                    onClick={() => setSizeChoice(item.id)}
                    className={chip(sizeChoice === item.id)}
                  >
                    {item.label[locale]}
                  </button>
                ))}
                <button
                  type="button"
                  aria-pressed={sizeChoice === "custom"}
                  onClick={() => setSizeChoice("custom")}
                  className={chip(sizeChoice === "custom")}
                >
                  {t.custom}
                </button>
              </div>

              {sizeChoice === "custom" && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[11px] text-foreground-muted">{t.customW}</span>
                    <Input
                      value={customWidth}
                      onChange={(event) => setCustomWidth(event.target.value)}
                      onBlur={() => setCustomWidth(edgeText(customWidth, 1080))}
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
                      onBlur={() => setCustomHeight(edgeText(customHeight, 1920))}
                      inputMode="numeric"
                      size="xs"
                      aria-label={t.customH}
                    />
                  </label>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 items-start gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] text-foreground-muted">{t.fontSize}</span>
                <Input
                  value={fontInput}
                  onChange={(event) => {
                    // The user is back in charge of the size, so the notice
                    // about the last shrink no longer describes the canvas
                    setAutoSize(null);
                    setFontInput(event.target.value);
                  }}
                  onFocus={() => setFontFocused(true)}
                  onBlur={() => {
                    setFontFocused(false);
                    // Round the field to what the canvas would actually use
                    setFontInput(String(clampFont(Number.parseInt(fontInput, 10))));
                  }}
                  inputMode="numeric"
                  size="xs"
                  aria-label={t.fontSize}
                />
              </label>
              {autoSize !== null && (
                <p
                  role="status"
                  className="flex items-start gap-1 text-[11px] leading-relaxed text-orange-fg"
                >
                  <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>{t.shrinkNote(autoSize)}</span>
                </p>
              )}
            </div>
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

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] text-foreground-muted">{t.lineHeight}</span>
              <div className="flex flex-wrap gap-1.5">
                {LINE_HEIGHT_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={lineHeightId === id}
                    onClick={() => setLineHeightId(id)}
                    className={chip(lineHeightId === id)}
                  >
                    {t.lineHeights[id]}
                  </button>
                ))}
                <button
                  type="button"
                  aria-pressed={lineHeightId === "custom"}
                  onClick={() => pickLineHeight("custom")}
                  className={chip(lineHeightId === "custom")}
                >
                  {t.custom}
                </button>
              </div>
              {lineHeightId === "custom" && (
                <div className="flex items-center gap-1.5 pt-1">
                  <Input
                    value={customLineHeight}
                    onChange={(event) => setCustomLineHeight(event.target.value)}
                    onBlur={() => setCustomLineHeight(String(clampLineHeight(decimal(customLineHeight))))}
                    inputMode="decimal"
                    size="xs"
                    placeholder="1.5"
                    aria-label={t.customLineHeight}
                    className="w-20 font-mono"
                  />
                  <span className="text-[11px] text-foreground-subtle">{t.lineHeightUnit}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] text-foreground-muted">{t.padding}</span>
              <div className="flex flex-wrap gap-1.5">
                {PADDING_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={paddingId === id}
                    onClick={() => setPaddingId(id)}
                    className={chip(paddingId === id)}
                  >
                    {t.paddings[id]}
                  </button>
                ))}
                <button
                  type="button"
                  aria-pressed={paddingId === "custom"}
                  onClick={() => pickPadding("custom")}
                  className={chip(paddingId === "custom")}
                >
                  {t.custom}
                </button>
              </div>
              {paddingId === "custom" && (
                <div className="flex items-center gap-1.5 pt-1">
                  <Input
                    value={customPadding}
                    onChange={(event) => setCustomPadding(event.target.value)}
                    onBlur={() => setCustomPadding(String(clampPadding(Number.parseInt(customPadding, 10))))}
                    inputMode="numeric"
                    size="xs"
                    placeholder="96"
                    aria-label={t.customPadding}
                    className="w-20 font-mono"
                  />
                  <span className="text-[11px] text-foreground-subtle">{t.paddingUnit}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <SampleButton onClick={() => updateText(t.sampleText)} label={t.sample} />
            <ClearButton onClick={() => updateText("")} label={t.clear} />
          </div>
          <p className="text-[11px] leading-relaxed text-foreground-subtle">{t.hint}</p>
        </section>

        <section className="flex h-full min-w-0 flex-col gap-3">
          <div className="flex max-h-[calc(100vh-10rem)] min-h-[420px] flex-1 items-start justify-center overflow-auto rounded-lg border border-border bg-surface p-3">
            <canvas
              ref={previewRef}
              width={frameWidth}
              height={layout.imageHeight}
              aria-label={t.preview}
              className="mx-auto block h-auto w-full rounded-md"
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
                {frameWidth} × {layout.imageHeight}
              </span>{" "}
              · {t.note}
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}

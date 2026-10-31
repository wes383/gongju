"use client";

import * as React from "react";
import { Download } from "lucide-react";
import JsBarcode from "jsbarcode";
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
import { ColorField } from "@/components/tools/color-field";
import { ErrorNote, OptionBar, OptionField, Toggle } from "@/components/tools/tool-ui";
import { downloadBlob } from "@/lib/image";

const COPY = {
  zh: {
    format: "格式",
    value: "内容",
    barWidth: "条宽",
    height: "高度",
    showText: "显示文字",
    fontSize: "字号",
    margin: "留白",
    colors: "颜色",
    preview: "预览",
    downloadPng: "下载 PNG",
    downloadSvg: "下载 SVG",
    empty: "输入内容后生成条形码",
    note: "校验位会自动计算（EAN / UPC / ITF 只需填前面几位）；不同格式对字符有要求，填错会在上方提示。",
    hints: {
      CODE128: "任意 ASCII 字符",
      EAN13: "12 或 13 位数字",
      EAN8: "7 或 8 位数字",
      UPC: "11 或 12 位数字",
      CODE39: "数字、大写字母与 - . $ / + % 空格",
      ITF14: "13 或 14 位数字",
      MSI: "数字",
      pharmacode: "3–131070 的整数",
      codabar: "数字与 - $ : / . +",
    },
  },
  en: {
    format: "Format",
    value: "Value",
    barWidth: "Bar width",
    height: "Height",
    showText: "Show text",
    fontSize: "Font size",
    margin: "Margin",
    colors: "Colours",
    preview: "Preview",
    downloadPng: "Download PNG",
    downloadSvg: "Download SVG",
    empty: "Type a value to generate a barcode",
    note: "Check digits are calculated for you (EAN, UPC and ITF accept the short form); each format has its own character rules and reports problems above.",
    hints: {
      CODE128: "Any ASCII character",
      EAN13: "12 or 13 digits",
      EAN8: "7 or 8 digits",
      UPC: "11 or 12 digits",
      CODE39: "Digits, uppercase letters and - . $ / + % space",
      ITF14: "13 or 14 digits",
      MSI: "Digits",
      pharmacode: "Integer from 3 to 131070",
      codabar: "Digits and - $ : / . +",
    },
  },
};

const FORMATS = ["CODE128", "EAN13", "EAN8", "UPC", "CODE39", "ITF14", "MSI", "pharmacode", "codabar"] as const;
type Format = (typeof FORMATS)[number];

const DEFAULTS: Record<Format, string> = {
  CODE128: "GONGJU-2026",
  EAN13: "690123456789",
  EAN8: "1234567",
  UPC: "12345678901",
  CODE39: "GONGJU",
  ITF14: "1234567890123",
  MSI: "1234567",
  pharmacode: "1234",
  codabar: "A123456A",
};

export function BarcodeTool() {
  const t = useCopy(COPY);
  const [format, setFormat] = React.useState<Format>("CODE128");
  const [value, setValue] = React.useState(DEFAULTS.CODE128);
  const [barWidth, setBarWidth] = React.useState(2);
  const [height, setHeight] = React.useState(80);
  const [showText, setShowText] = React.useState(true);
  const [fontSize, setFontSize] = React.useState(14);
  const [margin, setMargin] = React.useState(10);
  const [lineColor, setLineColor] = React.useState("#000000");
  const [background, setBackground] = React.useState("#ffffff");
  const [error, setError] = React.useState<string | null>(null);

  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const options = React.useMemo(
    () => ({
      format,
      width: barWidth,
      height,
      displayValue: showText,
      fontSize,
      margin,
      lineColor,
      background,
    }),
    [format, barWidth, height, showText, fontSize, margin, lineColor, background]
  );

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      if (!value.trim()) {
        setError(null);
        const ctx = canvas.getContext("2d");
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }
      try {
        JsBarcode(canvas, value.trim(), options);
        setError(null);
      } catch (err) {
        // JsBarcode sometimes throws a plain string, so read the message defensively
        const message = err instanceof Error ? err.message : String(err);
        setError(message.replace(/^.*?: /, ""));
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [value, options]);

  const downloadSvg = () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    try {
      JsBarcode(svg, value.trim(), options);
      const source = new XMLSerializer().serializeToString(svg);
      downloadBlob(new Blob([source], { type: "image/svg+xml" }), "barcode.svg");
    } catch {
      /* the canvas preview already reports the problem */
    }
  };

  const downloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => blob && downloadBlob(blob, "barcode.png"), "image/png");
  };

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <OptionField label={t.format}>
          <Select
            value={format}
            onValueChange={(next) => {
              const key = next as Format;
              setFormat(key);
              setValue(DEFAULTS[key]);
            }}
          >
            <SelectTrigger size="xs" aria-label={t.format} className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FORMATS.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </OptionField>

        <OptionField label={t.value}>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label={t.value}
            size="xs"
            spellCheck={false}
            className="w-56 font-mono"
          />
        </OptionField>
      </OptionBar>

      <OptionBar>
        <OptionField label={t.barWidth}>
          <input
            type="range"
            min={1}
            max={4}
            value={barWidth}
            onChange={(e) => setBarWidth(Number(e.target.value))}
            aria-label={t.barWidth}
            className="w-20 accent-[var(--accent)]"
          />
          <span className="w-6 font-mono text-[11px] text-foreground-subtle">{barWidth}</span>
        </OptionField>

        <OptionField label={t.height}>
          <input
            type="range"
            min={40}
            max={200}
            step={10}
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
            aria-label={t.height}
            className="w-24 accent-[var(--accent)]"
          />
          <span className="w-10 font-mono text-[11px] text-foreground-subtle">{height}px</span>
        </OptionField>

        <OptionField label={t.margin}>
          <input
            type="range"
            min={0}
            max={40}
            step={2}
            value={margin}
            onChange={(e) => setMargin(Number(e.target.value))}
            aria-label={t.margin}
            className="w-20 accent-[var(--accent)]"
          />
          <span className="w-8 font-mono text-[11px] text-foreground-subtle">{margin}</span>
        </OptionField>

        <Toggle checked={showText} onChange={setShowText} label={t.showText} />

        {showText && (
          <OptionField label={t.fontSize}>
            <input
              type="range"
              min={8}
              max={28}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              aria-label={t.fontSize}
              className="w-20 accent-[var(--accent)]"
            />
            <span className="w-8 font-mono text-[11px] text-foreground-subtle">{fontSize}</span>
          </OptionField>
        )}

        <OptionField label={t.colors}>
          <ColorField label={t.colors} value={lineColor} onChange={setLineColor} />
          <ColorField label={`${t.colors} 2`} value={background} onChange={setBackground} />
        </OptionField>
      </OptionBar>

      <p className="text-[11px] text-foreground-subtle">
        {t.hints[format]}
      </p>

      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="grid gap-3 lg:grid-cols-[1fr_260px]">
        <div className="flex min-h-[240px] items-center justify-center overflow-auto rounded-lg border border-border bg-surface p-4">
          {value.trim() ? (
            <canvas ref={canvasRef} className="max-w-full" />
          ) : (
            <p className="text-sm text-foreground-subtle">{t.empty}</p>
          )}
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
          <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
            {t.preview}
          </span>
          <Button
            type="button"
            size="sm"
            className="gap-1.5"
            disabled={!!error || !value.trim()}
            onClick={downloadPng}
          >
            <Download className="h-4 w-4" />
            {t.downloadPng}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={!!error || !value.trim()}
            onClick={downloadSvg}
          >
            <Download className="h-4 w-4" />
            {t.downloadSvg}
          </Button>
          <p className="mt-1 text-[11px] leading-relaxed text-foreground-subtle">{t.note}</p>
        </div>
      </div>
    </div>
  );
}

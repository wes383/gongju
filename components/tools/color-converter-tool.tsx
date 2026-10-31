"use client";

import * as React from "react";
import { Shuffle } from "lucide-react";
import { useCopy } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { ColorField } from "@/components/tools/color-field";
import { CopyButton, OptionBar } from "@/components/tools/tool-ui";
import {
  parseColor,
  randomHex,
  readableTextColor,
  rgbToCmyk,
  rgbToHex,
  rgbToHsl,
  rgbToHsv,
} from "@/lib/color";

const COPY = {
  zh: {
    color: "颜色",
    random: "随机颜色",
    preview: "预览",
    sample: "Aa 文字示例",
    note: "输入框支持 #rgb、#rrggbb、rgb()、hsl() 等写法，粘贴后会自动识别。",
  },
  en: {
    color: "Colour",
    random: "Random colour",
    preview: "Preview",
    sample: "Aa Sample text",
    note: "The input accepts #rgb, #rrggbb, rgb() and hsl() — paste anything and it is parsed.",
  },
};

const round = (n: number) => Math.round(n * 10) / 10;

export function ColorConverterTool() {
  const t = useCopy(COPY);
  const [hex, setHex] = React.useState("#3b82f6");
  const rgb = parseColor(hex) ?? { r: 59, g: 130, b: 246 };

  const hsl = rgbToHsl(rgb);
  const hsv = rgbToHsv(rgb);
  const cmyk = rgbToCmyk(rgb);
  const normalized = rgbToHex(rgb);
  const text = readableTextColor(rgb);

  const rows = [
    { label: "HEX", value: normalized.toUpperCase() },
    { label: "RGB", value: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` },
    { label: "HSL", value: `hsl(${round(hsl.h)}, ${round(hsl.s)}%, ${round(hsl.l)}%)` },
    { label: "HSV", value: `hsv(${round(hsv.h)}, ${round(hsv.s)}%, ${round(hsv.v)}%)` },
    {
      label: "CMYK",
      value: `cmyk(${round(cmyk.c)}%, ${round(cmyk.m)}%, ${round(cmyk.y)}%, ${round(cmyk.k)}%)`,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <span className="text-xs font-medium text-foreground-muted">{t.color}</span>
        <ColorField label={t.color} value={normalized} onChange={setHex} />
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="gap-1.5"
          onClick={() => setHex(randomHex())}
        >
          <Shuffle className="h-3.5 w-3.5" />
          {t.random}
        </Button>
      </OptionBar>

      <div className="grid gap-3 lg:grid-cols-[240px_1fr]">
        <div
          className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-lg border border-border p-4"
          style={{ background: normalized, color: text }}
        >
          <span className="font-mono text-lg font-semibold">{normalized.toUpperCase()}</span>
          <span className="text-sm opacity-80">{t.sample}</span>
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0"
            >
              <span className="w-14 shrink-0 font-mono text-[11px] uppercase text-foreground-subtle">
                {row.label}
              </span>
              <code className="min-w-0 flex-1 break-all font-mono text-xs text-foreground">
                {row.value}
              </code>
              <CopyButton value={row.value} size="icon-xs" />
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}

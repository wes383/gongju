"use client";

import * as React from "react";
import { Shuffle } from "lucide-react";
import { useCopy } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { ColorField, Swatch } from "@/components/tools/color-field";
import { CopyButton, OptionBar, OptionField, Segmented } from "@/components/tools/tool-ui";
import {
  harmony,
  hslToRgb,
  parseColor,
  randomHex,
  readableTextColor,
  rgbToHex,
  rgbToHsl,
  type HarmonyKind,
} from "@/lib/color";

const COPY = {
  zh: {
    base: "基准色",
    kind: "配色方式",
    random: "随机",
    css: "CSS 变量",
    kinds: {
      complementary: "互补",
      analogous: "类似",
      triadic: "三角",
      tetradic: "四角",
      split: "分裂互补",
      monochromatic: "单色",
    },
    note: "互补是色环上正对的两个颜色；类似是相邻 ±30°；三角是三等分；四角是四等分；分裂互补取 150° 与 210°；单色只改明度。",
  },
  en: {
    base: "Base colour",
    kind: "Harmony",
    random: "Random",
    css: "CSS variables",
    kinds: {
      complementary: "Complement",
      analogous: "Analogous",
      triadic: "Triadic",
      tetradic: "Tetradic",
      split: "Split",
      monochromatic: "Mono",
    },
    note: "Complement is the opposite hue; analogous ±30°; triadic splits the wheel in three; tetradic in four; split-complement takes 150° and 210°; mono only varies lightness.",
  },
};

const KINDS: HarmonyKind[] = [
  "complementary",
  "analogous",
  "triadic",
  "tetradic",
  "split",
  "monochromatic",
];

const round = (n: number) => Math.round(n);

export function ColorPaletteTool() {
  const t = useCopy(COPY);
  const [hex, setHex] = React.useState("#3b82f6");
  const [kind, setKind] = React.useState<HarmonyKind>("complementary");

  const base = parseColor(hex) ?? { r: 59, g: 130, b: 246 };
  const baseHsl = rgbToHsl(base);
  const colors = harmony(baseHsl, kind).map((hsl) => {
    const rgb = hslToRgb(hsl);
    return { hex: rgbToHex(rgb), rgb, hsl };
  });

  const css = colors
    .map((color, index) => `  --color-${index + 1}: ${color.hex};`)
    .join("\n");

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <OptionField label={t.base}>
          <ColorField label={t.base} value={hex} onChange={setHex} />
        </OptionField>
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

        <OptionField label={t.kind}>
          <Segmented
            ariaLabel={t.kind}
            value={kind}
            onChange={setKind}
            options={KINDS.map((k) => ({ value: k, label: t.kinds[k] }))}
          />
        </OptionField>
      </OptionBar>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {colors.map((color, index) => {
          const text = readableTextColor(color.rgb);
          const value = color.hex.toUpperCase();
          return (
            <div
              key={`${color.hex}-${index}`}
              className="flex flex-col overflow-hidden rounded-lg border border-border"
            >
              <div
                className="flex h-24 items-end justify-between p-2"
                style={{ background: color.hex, color: text }}
              >
                <span className="font-mono text-xs font-semibold">{value}</span>
                <CopyButton
                  value={value}
                  size="icon-xs"
                  className="text-inherit hover:bg-black/10"
                />
              </div>
              <div className="flex items-center gap-2 bg-surface px-2 py-1.5">
                <Swatch color={color.hex} className="h-4 w-4 shrink-0" />
                <span className="font-mono text-[10px] text-foreground-subtle">
                  hsl({round(color.hsl.h)}, {round(color.hsl.s)}%, {round(color.hsl.l)}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex h-10 items-center gap-2 border-b border-border px-4">
          <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
            {t.css}
          </span>
          <CopyButton value={`:root {\n${css}\n}`} size="xs" className="ml-auto" />
        </header>
        <pre className="overflow-auto px-4 py-3 font-mono text-xs leading-relaxed text-foreground">
          {`:root {\n${css}\n}`}
        </pre>
      </div>

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}

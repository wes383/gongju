"use client";

import * as React from "react";
import { useCopy } from "@/components/locale-provider";
import { ColorField } from "@/components/tools/color-field";
import { CopyButton, OptionBar, OptionField, Segmented, Toggle } from "@/components/tools/tool-ui";
import { parseColor, rgbaString } from "@/lib/color";

const COPY = {
  zh: {
    mode: "类型",
    box: "盒阴影",
    text: "文字阴影",
    x: "水平",
    y: "垂直",
    blur: "模糊",
    spread: "扩展",
    opacity: "不透明度",
    color: "颜色",
    inset: "内阴影",
    preview: "预览",
    css: "CSS",
    sample: "阴影预览 Shadow",
    note: "盒阴影支持 inset（内阴影）；文字阴影没有扩展半径。模糊值越大边缘越柔和，扩展会让阴影整体变大。",
  },
  en: {
    mode: "Type",
    box: "Box shadow",
    text: "Text shadow",
    x: "X",
    y: "Y",
    blur: "Blur",
    spread: "Spread",
    opacity: "Opacity",
    color: "Colour",
    inset: "Inset",
    preview: "Preview",
    css: "CSS",
    sample: "Shadow preview 阴影",
    note: "Box shadows support inset; text shadows have no spread. A larger blur softens the edge, while spread grows the shadow itself.",
  },
};

type Mode = "box" | "text";

export function BoxShadowTool() {
  const t = useCopy(COPY);
  const [mode, setMode] = React.useState<Mode>("box");
  const [x, setX] = React.useState(0);
  const [y, setY] = React.useState(12);
  const [blur, setBlur] = React.useState(28);
  const [spread, setSpread] = React.useState(-4);
  const [opacity, setOpacity] = React.useState(25);
  const [color, setColor] = React.useState("#0f172a");
  const [inset, setInset] = React.useState(false);

  const rgb = parseColor(color) ?? { r: 15, g: 23, b: 42 };
  const fill = rgbaString(rgb, opacity / 100);

  const shadow =
    mode === "box"
      ? `${inset ? "inset " : ""}${x}px ${y}px ${blur}px ${spread}px ${fill}`
      : `${x}px ${y}px ${blur}px ${fill}`;

  const css = mode === "box" ? `box-shadow: ${shadow};` : `text-shadow: ${shadow};`;

  const sliders: { label: string; value: number; set: (n: number) => void; min: number; max: number }[] = [
    { label: t.x, value: x, set: setX, min: -60, max: 60 },
    { label: t.y, value: y, set: setY, min: -60, max: 60 },
    { label: t.blur, value: blur, set: setBlur, min: 0, max: 100 },
    ...(mode === "box"
      ? [{ label: t.spread, value: spread, set: setSpread, min: -40, max: 60 }]
      : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <OptionField label={t.mode}>
          <Segmented
            ariaLabel={t.mode}
            value={mode}
            onChange={setMode}
            options={[
              { value: "box", label: t.box },
              { value: "text", label: t.text },
            ]}
          />
        </OptionField>

        <OptionField label={t.color}>
          <ColorField label={t.color} value={color} onChange={setColor} />
        </OptionField>

        <OptionField label={t.opacity}>
          <input
            type="range"
            min={0}
            max={100}
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            aria-label={t.opacity}
            className="w-24 accent-[var(--accent)]"
          />
          <span className="w-9 font-mono text-[11px] text-foreground-subtle">{opacity}%</span>
        </OptionField>

        {mode === "box" && (
          <Toggle checked={inset} onChange={setInset} label={t.inset} />
        )}
      </OptionBar>

      <OptionBar>
        {sliders.map((slider) => (
          <OptionField key={slider.label} label={slider.label}>
            <input
              type="range"
              min={slider.min}
              max={slider.max}
              value={slider.value}
              onChange={(e) => slider.set(Number(e.target.value))}
              aria-label={slider.label}
              className="w-24 accent-[var(--accent)]"
            />
            <span className="w-10 font-mono text-[11px] text-foreground-subtle">
              {slider.value}px
            </span>
          </OptionField>
        ))}
      </OptionBar>

      <div className="grid gap-3 lg:grid-cols-[1fr_340px]">
        <div className="flex min-h-[260px] items-center justify-center rounded-lg border border-border bg-hover-bg p-8">
          {mode === "box" ? (
            <div
              className="flex h-32 w-56 items-center justify-center rounded-xl bg-surface text-xs text-foreground-muted"
              style={{ boxShadow: shadow }}
            >
              {t.preview}
            </div>
          ) : (
            <span
              className="font-display text-3xl font-semibold text-foreground"
              style={{ textShadow: shadow }}
            >
              {t.sample}
            </span>
          )}
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <header className="flex h-10 items-center gap-2 border-b border-border px-4">
            <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
              {t.css}
            </span>
            <CopyButton value={css} size="xs" className="ml-auto" />
          </header>
          <pre className="overflow-auto whitespace-pre-wrap break-all px-4 py-3 font-mono text-xs leading-relaxed text-foreground">
            {css}
          </pre>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}

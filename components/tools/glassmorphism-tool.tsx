"use client";

import * as React from "react";
import { useCopy } from "@/components/locale-provider";
import { ColorField } from "@/components/tools/color-field";
import { CopyButton, OptionBar, OptionField } from "@/components/tools/tool-ui";
import { parseColor, rgbaString } from "@/lib/color";

const COPY = {
  zh: {
    tint: "底色",
    blur: "模糊",
    opacity: "不透明度",
    border: "描边",
    radius: "圆角",
    preview: "预览",
    css: "CSS",
    note: "毛玻璃的关键是「半透明背景 + backdrop-filter: blur()」，再加一层浅色描边模拟玻璃边缘的高光。",
  },
  en: {
    tint: "Tint",
    blur: "Blur",
    opacity: "Opacity",
    border: "Border",
    radius: "Radius",
    preview: "Preview",
    css: "CSS",
    note: "The trick is a translucent background plus backdrop-filter: blur(), with a light border standing in for the glass edge highlight.",
  },
};

export function GlassmorphismTool() {
  const t = useCopy(COPY);
  const [tint, setTint] = React.useState("#ffffff");
  const [blur, setBlur] = React.useState(16);
  const [opacity, setOpacity] = React.useState(18);
  const [border, setBorder] = React.useState(1);
  const [radius, setRadius] = React.useState(20);

  const rgb = parseColor(tint) ?? { r: 255, g: 255, b: 255 };
  const fill = rgbaString(rgb, opacity / 100);

  const css = [
    "background: " + fill + ";",
    `backdrop-filter: blur(${blur}px);`,
    "-webkit-backdrop-filter: blur(" + blur + "px);",
    `border: ${border}px solid rgba(255, 255, 255, 0.35);`,
    `border-radius: ${radius}px;`,
  ].join("\n");

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <OptionField label={t.tint}>
          <ColorField label={t.tint} value={tint} onChange={setTint} />
        </OptionField>

        <OptionField label={t.blur}>
          <input
            type="range"
            min={0}
            max={40}
            value={blur}
            onChange={(e) => setBlur(Number(e.target.value))}
            aria-label={t.blur}
            className="w-24 accent-[var(--accent)]"
          />
          <span className="w-10 font-mono text-[11px] text-foreground-subtle">{blur}px</span>
        </OptionField>

        <OptionField label={t.opacity}>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            aria-label={t.opacity}
            className="w-24 accent-[var(--accent)]"
          />
          <span className="w-9 font-mono text-[11px] text-foreground-subtle">{opacity}%</span>
        </OptionField>

        <OptionField label={t.border}>
          <input
            type="range"
            min={0}
            max={6}
            value={border}
            onChange={(e) => setBorder(Number(e.target.value))}
            aria-label={t.border}
            className="w-20 accent-[var(--accent)]"
          />
          <span className="w-9 font-mono text-[11px] text-foreground-subtle">{border}px</span>
        </OptionField>

        <OptionField label={t.radius}>
          <input
            type="range"
            min={0}
            max={60}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            aria-label={t.radius}
            className="w-20 accent-[var(--accent)]"
          />
          <span className="w-9 font-mono text-[11px] text-foreground-subtle">{radius}px</span>
        </OptionField>
      </OptionBar>

      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="relative flex min-h-[260px] items-center justify-center bg-[radial-gradient(circle_at_20%_20%,#f472b6,transparent_55%),radial-gradient(circle_at_80%_30%,#38bdf8,transparent_55%),radial-gradient(circle_at_50%_85%,#a3e635,transparent_55%)] bg-slate-900 p-8">
            <div
              className="flex h-36 w-full max-w-xs flex-col items-center justify-center gap-1 px-6 text-center text-white"
              style={{
                background: fill,
                backdropFilter: `blur(${blur}px)`,
                WebkitBackdropFilter: `blur(${blur}px)`,
                border: `${border}px solid rgba(255, 255, 255, 0.35)`,
                borderRadius: `${radius}px`,
              }}
            >
              <span className="text-sm font-semibold">{t.preview}</span>
              <span className="text-[11px] opacity-80">backdrop-filter: blur({blur}px)</span>
            </div>
          </div>
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

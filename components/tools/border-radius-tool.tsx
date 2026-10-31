"use client";

import * as React from "react";
import { Link, Link2Off } from "lucide-react";
import { useCopy } from "@/components/locale-provider";
import { Input } from "@/components/ui/input";
import { CopyButton, OptionBar, OptionField } from "@/components/tools/tool-ui";
import { cn } from "@/lib/utils";

const COPY = {
  zh: {
    corners: "圆角",
    topLeft: "左上",
    topRight: "右上",
    bottomRight: "右下",
    bottomLeft: "左下",
    link: "四角联动",
    preview: "预览",
    css: "CSS",
    note: "数值单位是 px，最多 200px；四角联动时改任意一个其它三个跟着变。",
  },
  en: {
    corners: "Radius",
    topLeft: "Top left",
    topRight: "Top right",
    bottomRight: "Bottom right",
    bottomLeft: "Bottom left",
    link: "Link corners",
    preview: "Preview",
    css: "CSS",
    note: "Values are in px, up to 200. With corners linked, editing one updates the other three.",
  },
};

export function BorderRadiusTool() {
  const t = useCopy(COPY);
  const [corners, setCorners] = React.useState({ tl: 16, tr: 16, br: 16, bl: 16 });
  const [linked, setLinked] = React.useState(true);

  const setCorner = (key: keyof typeof corners, value: number) => {
    const next = Math.min(Math.max(value, 0), 200);
    setCorners((prev) =>
      linked
        ? { tl: next, tr: next, br: next, bl: next }
        : { ...prev, [key]: next }
    );
  };

  const css = `border-radius: ${corners.tl}px ${corners.tr}px ${corners.br}px ${corners.bl}px;`;

  const fields: { key: keyof typeof corners; label: string }[] = [
    { key: "tl", label: t.topLeft },
    { key: "tr", label: t.topRight },
    { key: "br", label: t.bottomRight },
    { key: "bl", label: t.bottomLeft },
  ];

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <button
          type="button"
          onClick={() => setLinked(!linked)}
          aria-pressed={linked}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-md border px-2 text-[11px] font-medium transition-colors duration-base ease-out",
            linked
              ? "border-accent bg-hover-bg text-foreground"
              : "border-border text-foreground-subtle hover:bg-hover-bg"
          )}
        >
          {linked ? <Link className="h-3.5 w-3.5" /> : <Link2Off className="h-3.5 w-3.5" />}
          {t.link}
        </button>

        {fields.map((field) => (
          <OptionField key={field.key} label={field.label}>
            <Input
              type="number"
              min={0}
              max={200}
              value={corners[field.key]}
              onChange={(e) => setCorner(field.key, Number(e.target.value) || 0)}
              aria-label={field.label}
              size="xs"
              className="w-16 text-center font-mono"
            />
          </OptionField>
        ))}
      </OptionBar>

      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
        <div className="flex min-h-[260px] items-center justify-center rounded-lg border border-border bg-surface p-6">
          <div
            className="h-40 w-56 bg-foreground/80"
            style={{
              borderRadius: `${corners.tl}px ${corners.tr}px ${corners.br}px ${corners.bl}px`,
            }}
          />
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
          <div className="border-t border-border px-4 py-3 text-[11px] text-foreground-subtle">
            {corners.tl} / {corners.tr} / {corners.br} / {corners.bl}
          </div>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}

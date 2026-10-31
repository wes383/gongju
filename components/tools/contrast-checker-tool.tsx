"use client";

import * as React from "react";
import { ArrowLeftRight } from "lucide-react";
import { useCopy } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { ColorField } from "@/components/tools/color-field";
import { OptionBar } from "@/components/tools/tool-ui";
import { contrastRatio, parseColor } from "@/lib/color";
import { cn } from "@/lib/utils";

const COPY = {
  zh: {
    foreground: "文字颜色",
    background: "背景颜色",
    swap: "交换",
    ratio: "对比度",
    normal: "正文",
    large: "大字",
    largeHint: "18pt（24px）以上，或 14pt（18.66px）加粗",
    pass: "通过",
    fail: "不通过",
    sample: "这段文字用来检查可读性",
    note: "按 WCAG 2.1 计算：正文需要 4.5:1（AAA 7:1），大字需要 3:1（AAA 4.5:1）。",
    levels: "等级",
  },
  en: {
    foreground: "Text colour",
    background: "Background",
    swap: "Swap",
    ratio: "Contrast",
    normal: "Body text",
    large: "Large text",
    largeHint: "18pt (24px) and up, or 14pt (18.66px) bold",
    pass: "Pass",
    fail: "Fail",
    sample: "This text is here to check readability",
    note: "Computed per WCAG 2.1: body text needs 4.5:1 (AAA 7:1), large text needs 3:1 (AAA 4.5:1).",
    levels: "Levels",
  },
};

function Pill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        ok ? "bg-green/10 text-green-fg" : "bg-red/10 text-red-fg"
      )}
    >
      {label}
    </span>
  );
}

export function ContrastCheckerTool() {
  const t = useCopy(COPY);
  const [fg, setFg] = React.useState("#1f2937");
  const [bg, setBg] = React.useState("#ffffff");

  const fgRgb = parseColor(fg) ?? { r: 31, g: 41, b: 55 };
  const bgRgb = parseColor(bg) ?? { r: 255, g: 255, b: 255 };
  const ratio = contrastRatio(fgRgb, bgRgb);

  const checks = [
    { key: "AA", label: "AA", threshold: 4.5, group: t.normal },
    { key: "AAA", label: "AAA", threshold: 7, group: t.normal },
    { key: "AA-large", label: "AA", threshold: 3, group: t.large },
    { key: "AAA-large", label: "AAA", threshold: 4.5, group: t.large },
  ];

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <span className="text-xs font-medium text-foreground-muted">{t.foreground}</span>
        <ColorField label={t.foreground} value={fg} onChange={setFg} />
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="gap-1.5"
          onClick={() => {
            setFg(bg);
            setBg(fg);
          }}
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
          {t.swap}
        </Button>
        <span className="text-xs font-medium text-foreground-muted">{t.background}</span>
        <ColorField label={t.background} value={bg} onChange={setBg} />
      </OptionBar>

      <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
        <div
          className="flex flex-col justify-center gap-3 rounded-lg border border-border p-6"
          style={{ background: bg, color: fg }}
        >
          <p className="text-2xl font-semibold">{t.sample}</p>
          <p className="text-base">{t.sample}</p>
          <p className="text-sm">{t.sample}</p>
          <p className="text-xs">{t.sample}</p>
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="flex items-baseline gap-2 border-b border-border px-4 py-3">
            <span className="font-mono text-2xl font-semibold text-foreground">
              {ratio.toFixed(2)}
            </span>
            <span className="text-xs text-foreground-subtle">: 1</span>
            <span className="ml-auto text-[11px] uppercase tracking-wide text-foreground-subtle">
              {t.ratio}
            </span>
          </div>
          <ul>
            {checks.map((check) => (
              <li
                key={check.key}
                className="flex items-center gap-2 border-b border-border px-4 py-2 last:border-b-0"
              >
                <span className="text-xs text-foreground-muted">{check.group}</span>
                <span className="font-mono text-[11px] text-foreground-subtle">{check.label}</span>
                <span className="ml-auto font-mono text-[11px] text-foreground-subtle">
                  ≥ {check.threshold}
                </span>
                <Pill ok={ratio >= check.threshold} label={ratio >= check.threshold ? t.pass : t.fail} />
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-foreground-subtle">
        {t.note}
        <span className="ml-1 text-foreground-faint">{t.largeHint}</span>
      </p>
    </div>
  );
}

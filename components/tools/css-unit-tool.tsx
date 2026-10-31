"use client";

import * as React from "react";
import { useCopy } from "@/components/locale-provider";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CopyButton, OptionBar, OptionField } from "@/components/tools/tool-ui";

const COPY = {
  zh: {
    value: "数值",
    unit: "单位",
    base: "根字号",
    result: "换算结果",
    note: "rem / em / % 都按上面的根字号换算（假设父元素字号等于根字号）；pt、pc、in、cm、mm 是绝对单位，与根字号无关。",
  },
  en: {
    value: "Value",
    unit: "Unit",
    base: "Root size",
    result: "Conversions",
    note: "rem, em and % are converted against the root size above (assuming the parent font-size equals the root); pt, pc, in, cm and mm are absolute and ignore it.",
  },
};

type Unit = "px" | "rem" | "em" | "pt" | "pc" | "in" | "cm" | "mm" | "%";

const UNITS: Unit[] = ["px", "rem", "em", "%", "pt", "pc", "in", "cm", "mm"];

/** Everything funnels through px so there is a single source of truth. */
function toPx(value: number, unit: Unit, base: number): number {
  switch (unit) {
    case "px":
      return value;
    case "rem":
    case "em":
      return value * base;
    case "%":
      return (value / 100) * base;
    case "pt":
      return (value * 96) / 72;
    case "pc":
      return value * 16;
    case "in":
      return value * 96;
    case "cm":
      return (value * 96) / 2.54;
    case "mm":
      return (value * 96) / 25.4;
    default:
      return value;
  }
}

const round = (n: number) => {
  if (!Number.isFinite(n)) return "—";
  const fixed = Math.abs(n) >= 100 ? n.toFixed(1) : n.toFixed(3);
  return fixed.replace(/\.?0+$/, "");
};

export function CssUnitTool() {
  const t = useCopy(COPY);
  const [value, setValue] = React.useState("16");
  const [unit, setUnit] = React.useState<Unit>("px");
  const [base, setBase] = React.useState(16);

  const numeric = Number(value);
  const px = Number.isFinite(numeric) ? toPx(numeric, unit, base) : NaN;

  const rows: { label: string; value: string }[] = [
    { label: "px", value: round(px) },
    { label: "rem", value: round(px / base) },
    { label: "em", value: round(px / base) },
    { label: "%", value: round((px / base) * 100) },
    { label: "pt", value: round((px * 72) / 96) },
    { label: "pc", value: round(px / 16) },
    { label: "in", value: round(px / 96) },
    { label: "cm", value: round((px / 96) * 2.54) },
    { label: "mm", value: round((px / 96) * 25.4) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <OptionField label={t.value}>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label={t.value}
            size="xs"
            inputMode="decimal"
            className="w-24 text-center font-mono"
          />
        </OptionField>

        <OptionField label={t.unit}>
          <Select value={unit} onValueChange={(v) => setUnit(v as Unit)}>
            <SelectTrigger size="xs" aria-label={t.unit} className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UNITS.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </OptionField>

        <OptionField label={t.base}>
          <Input
            type="number"
            min={1}
            max={100}
            value={base}
            onChange={(e) => setBase(Math.min(Math.max(Number(e.target.value) || 16, 1), 100))}
            aria-label={t.base}
            size="xs"
            className="w-16 text-center font-mono"
          />
          <span className="text-[11px] text-foreground-subtle">px</span>
        </OptionField>
      </OptionBar>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex h-10 items-center border-b border-border px-4">
          <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
            {t.result}
          </span>
        </header>
        <ul>
          {rows.map((row) => (
            <li
              key={row.label}
              className="flex items-center gap-3 border-b border-border px-4 py-2 last:border-b-0"
            >
              <span className="w-12 shrink-0 font-mono text-[11px] text-foreground-subtle">
                {row.label}
              </span>
              <code className="min-w-0 flex-1 font-mono text-xs text-foreground">
                {row.value === "—" ? "—" : `${row.value}${row.label}`}
              </code>
              <CopyButton
                value={row.value === "—" ? "" : `${row.value}${row.label}`}
                size="icon-xs"
              />
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}

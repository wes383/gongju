"use client";

import * as React from "react";
import { useCopy } from "@/components/locale-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CopyButton, OptionBar, OptionField, Segmented } from "@/components/tools/tool-ui";

const COPY = {
  zh: {
    mode: "布局",
    flex: "Flex",
    grid: "Grid",
    direction: "方向",
    row: "横向",
    column: "纵向",
    wrap: "换行",
    nowrap: "不换行",
    wrapOn: "换行",
    justify: "主轴对齐",
    align: "交叉轴对齐",
    columns: "列数",
    gap: "间距",
    preview: "预览",
    css: "CSS",
    note: "预览里的方块高度不一，方便看出 align-items 的效果；Grid 模式下用 repeat(N, 1fr) 均分列宽。",
    justifyLabels: {
      "flex-start": "起点",
      center: "居中",
      "flex-end": "终点",
      "space-between": "两端对齐",
      "space-around": "环绕",
      "space-evenly": "均分",
    },
    alignLabels: {
      stretch: "拉伸",
      "flex-start": "起点",
      center: "居中",
      "flex-end": "终点",
      baseline: "基线",
    },
  },
  en: {
    mode: "Layout",
    flex: "Flex",
    grid: "Grid",
    direction: "Direction",
    row: "Row",
    column: "Column",
    wrap: "Wrap",
    nowrap: "No wrap",
    wrapOn: "Wrap",
    justify: "Justify",
    align: "Align",
    columns: "Columns",
    gap: "Gap",
    preview: "Preview",
    css: "CSS",
    note: "The boxes have different heights so align-items is visible; grid mode uses repeat(N, 1fr) for equal columns.",
    justifyLabels: {
      "flex-start": "Start",
      center: "Center",
      "flex-end": "End",
      "space-between": "Between",
      "space-around": "Around",
      "space-evenly": "Evenly",
    },
    alignLabels: {
      stretch: "Stretch",
      "flex-start": "Start",
      center: "Center",
      "flex-end": "End",
      baseline: "Baseline",
    },
  },
};

type Mode = "flex" | "grid";
type Justify = "flex-start" | "center" | "flex-end" | "space-between" | "space-around" | "space-evenly";
type Align = "stretch" | "flex-start" | "center" | "flex-end" | "baseline";

const JUSTIFY: Justify[] = [
  "flex-start",
  "center",
  "flex-end",
  "space-between",
  "space-around",
  "space-evenly",
];
const ALIGN: Align[] = ["stretch", "flex-start", "center", "flex-end", "baseline"];
const ITEMS = [1, 2, 3, 4, 5];

export function FlexboxTool() {
  const t = useCopy(COPY);
  const [mode, setMode] = React.useState<Mode>("flex");
  const [direction, setDirection] = React.useState<"row" | "column">("row");
  const [wrap, setWrap] = React.useState(false);
  const [justify, setJustify] = React.useState<Justify>("flex-start");
  const [align, setAlign] = React.useState<Align>("stretch");
  const [columns, setColumns] = React.useState(3);
  const [gap, setGap] = React.useState(12);

  const css =
    mode === "flex"
      ? [
          "display: flex;",
          `flex-direction: ${direction};`,
          `flex-wrap: ${wrap ? "wrap" : "nowrap"};`,
          `justify-content: ${justify};`,
          `align-items: ${align};`,
          `gap: ${gap}px;`,
        ].join("\n")
      : [
          "display: grid;",
          `grid-template-columns: repeat(${columns}, 1fr);`,
          `justify-items: ${justify === "space-between" || justify === "space-around" || justify === "space-evenly" ? "center" : justify};`,
          `align-items: ${align};`,
          `gap: ${gap}px;`,
        ].join("\n");

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <OptionField label={t.mode}>
          <Segmented
            ariaLabel={t.mode}
            value={mode}
            onChange={setMode}
            options={[
              { value: "flex", label: t.flex },
              { value: "grid", label: t.grid },
            ]}
          />
        </OptionField>

        {mode === "flex" && (
          <>
            <OptionField label={t.direction}>
              <Segmented
                ariaLabel={t.direction}
                value={direction}
                onChange={setDirection}
                options={[
                  { value: "row", label: t.row },
                  { value: "column", label: t.column },
                ]}
              />
            </OptionField>

            <OptionField label={t.wrap}>
              <Segmented
                ariaLabel={t.wrap}
                value={wrap ? "wrap" : "nowrap"}
                onChange={(value) => setWrap(value === "wrap")}
                options={[
                  { value: "nowrap", label: t.nowrap },
                  { value: "wrap", label: t.wrapOn },
                ]}
              />
            </OptionField>
          </>
        )}

        {mode === "grid" && (
          <OptionField label={t.columns}>
            <Segmented
              ariaLabel={t.columns}
              value={String(columns)}
              onChange={(value) => setColumns(Number(value))}
              options={["1", "2", "3", "4"].map((n) => ({ value: n, label: n }))}
            />
          </OptionField>
        )}
      </OptionBar>

      <OptionBar>
        <OptionField label={t.justify}>
          <Select value={justify} onValueChange={(v) => setJustify(v as Justify)}>
            <SelectTrigger size="xs" aria-label={t.justify} className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {JUSTIFY.map((value) => (
                <SelectItem key={value} value={value}>
                  {t.justifyLabels[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </OptionField>

        <OptionField label={t.align}>
          <Select value={align} onValueChange={(v) => setAlign(v as Align)}>
            <SelectTrigger size="xs" aria-label={t.align} className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALIGN.map((value) => (
                <SelectItem key={value} value={value}>
                  {t.alignLabels[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </OptionField>

        <OptionField label={t.gap}>
          <input
            type="range"
            min={0}
            max={48}
            value={gap}
            onChange={(e) => setGap(Number(e.target.value))}
            aria-label={t.gap}
            className="w-28 accent-[var(--accent)]"
          />
          <span className="w-10 font-mono text-[11px] text-foreground-subtle">{gap}px</span>
        </OptionField>
      </OptionBar>

      <div className="grid gap-3 lg:grid-cols-[1fr_340px]">
        <div
          className="min-h-[280px] rounded-lg border border-border bg-surface p-4"
          style={
            mode === "flex"
              ? {
                  display: "flex",
                  flexDirection: direction,
                  flexWrap: wrap ? "wrap" : "nowrap",
                  justifyContent: justify,
                  alignItems: align,
                  gap: `${gap}px`,
                }
              : {
                  display: "grid",
                  gridTemplateColumns: `repeat(${columns}, 1fr)`,
                  justifyItems:
                    justify === "space-between" || justify === "space-around" || justify === "space-evenly"
                      ? "center"
                      : justify,
                  alignItems: align,
                  gap: `${gap}px`,
                }
          }
        >
          {ITEMS.map((n) => (
            <div
              key={n}
              className="flex min-w-[64px] items-center justify-center rounded-md bg-accent/15 px-4 text-sm font-medium text-accent"
              style={{ height: 40 + n * 8 }}
            >
              {n}
            </div>
          ))}
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

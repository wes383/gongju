"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { useCopy } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { ColorField } from "@/components/tools/color-field";
import { CopyButton, OptionBar, OptionField, Segmented } from "@/components/tools/tool-ui";

const COPY = {
  zh: {
    type: "类型",
    linear: "线性",
    radial: "径向",
    conic: "锥形",
    angle: "角度",
    stops: "色标",
    add: "添加色标",
    remove: "删除",
    preview: "预览",
    css: "CSS",
    note: "色标按位置排序后输出；线性渐变的角度 0° 向上、90° 向右，锥形渐变的角度从 0° 开始顺时针旋转。",
  },
  en: {
    type: "Type",
    linear: "Linear",
    radial: "Radial",
    conic: "Conic",
    angle: "Angle",
    stops: "Stops",
    add: "Add stop",
    remove: "Remove",
    preview: "Preview",
    css: "CSS",
    note: "Stops are sorted by position. For linear gradients 0° points up and 90° right; conic gradients start at 0° and rotate clockwise.",
  },
};

type GradientType = "linear" | "radial" | "conic";

interface Stop {
  id: string;
  color: string;
  position: number;
}

const initialStops: Stop[] = [
  { id: "a", color: "#6366f1", position: 0 },
  { id: "b", color: "#ec4899", position: 100 },
];

export function GradientTool() {
  const t = useCopy(COPY);
  const [type, setType] = React.useState<GradientType>("linear");
  const [angle, setAngle] = React.useState(135);
  const [stops, setStops] = React.useState<Stop[]>(initialStops);

  const sorted = [...stops].sort((a, b) => a.position - b.position);
  const stopList = sorted.map((s) => `${s.color} ${s.position}%`).join(", ");

  const gradient =
    type === "linear"
      ? `linear-gradient(${angle}deg, ${stopList})`
      : type === "radial"
        ? `radial-gradient(circle at 50% 50%, ${stopList})`
        : `conic-gradient(from ${angle}deg, ${stopList})`;

  const css = `background: ${gradient};`;

  const update = (id: string, patch: Partial<Stop>) =>
    setStops((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <OptionField label={t.type}>
          <Segmented
            ariaLabel={t.type}
            value={type}
            onChange={setType}
            options={[
              { value: "linear", label: t.linear },
              { value: "radial", label: t.radial },
              { value: "conic", label: t.conic },
            ]}
          />
        </OptionField>

        {type !== "radial" && (
          <OptionField label={t.angle}>
            <input
              type="range"
              min={0}
              max={360}
              value={angle}
              onChange={(e) => setAngle(Number(e.target.value))}
              aria-label={t.angle}
              className="w-32 accent-[var(--accent)]"
            />
            <span className="w-10 font-mono text-[11px] text-foreground-subtle">{angle}°</span>
          </OptionField>
        )}

        <Button
          type="button"
          variant="outline"
          size="xs"
          className="ml-auto gap-1.5"
          disabled={stops.length >= 6}
          onClick={() =>
            setStops((prev) => [
              ...prev,
              {
                id: `s${Date.now()}`,
                color: "#facc15",
                position: 50,
              },
            ])
          }
        >
          <Plus className="h-3.5 w-3.5" />
          {t.add}
        </Button>
      </OptionBar>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex h-10 items-center border-b border-border px-4">
          <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
            {t.stops}
          </span>
        </header>
        <ul>
          {stops.map((stop, index) => (
            <li
              key={stop.id}
              className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-2 last:border-b-0"
            >
              <span className="w-6 shrink-0 font-mono text-[11px] text-foreground-subtle">
                {index + 1}
              </span>
              <ColorField
                label={`${t.stops} ${index + 1}`}
                value={stop.color}
                onChange={(color) => update(stop.id, { color })}
              />
              <input
                type="range"
                min={0}
                max={100}
                value={stop.position}
                onChange={(e) => update(stop.id, { position: Number(e.target.value) })}
                aria-label={`${t.stops} ${index + 1} %`}
                className="w-32 accent-[var(--accent)]"
              />
              <span className="w-10 font-mono text-[11px] text-foreground-subtle">
                {stop.position}%
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="ml-auto"
                disabled={stops.length <= 2}
                onClick={() => setStops((prev) => prev.filter((s) => s.id !== stop.id))}
                aria-label={t.remove}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
        <div
          className="min-h-[240px] rounded-lg border border-border"
          style={{ background: gradient }}
          role="img"
          aria-label={t.preview}
        />

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

"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { CopyButton, ErrorNote, Pane, Segmented } from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { errorText, safe } from "@/lib/errors";
import { roundUpWidth, traceCurrent, traceWidth, type CopperWeight, type LayerType } from "@/lib/pcb";
import { formatNumber } from "@/lib/units";

const COPY = {
  zh: {
    current: "电流",
    deltaT: "允许温升",
    copper: "铜厚",
    layer: "层",
    external: "外层",
    internal: "内层",
    length: "走线长度",
    lengthHint: "用于估算压降，填 0 可跳过",
    result: "最小线宽",
    recommended: "建议取",
    area: "截面积",
    resistance: "电阻",
    drop: "压降",
    loss: "损耗",
    empty: "填入电流与温升，这里给出线宽",
    inverse: "反查：给定线宽能过多大电流",
    width: "线宽",
    capacity: "载流能力",
    note: "依据 IPC-2221 曲线拟合：A = (I / (k · ΔT^0.44))^(1/0.725)，外层 k = 0.048、内层 0.024。这是满足温升的最小值，不含工艺余量；实际布板建议再留 20%–50%，大电流或高可靠场景按 IPC-2152 复核。",
  },
  en: {
    current: "Current",
    deltaT: "Allowed rise",
    copper: "Copper",
    layer: "Layer",
    external: "Outer",
    internal: "Inner",
    length: "Trace length",
    lengthHint: "Used for the drop; leave 0 to skip",
    result: "Minimum width",
    recommended: "Use at least",
    area: "Cross-section",
    resistance: "Resistance",
    drop: "Voltage drop",
    loss: "Loss",
    empty: "Enter a current and a temperature rise to size the trace",
    inverse: "Reverse: how much current fits a given width",
    width: "Width",
    capacity: "Ampacity",
    note: "Based on the IPC-2221 curve fit: A = (I / (k · ΔT^0.44))^(1/0.725) with k = 0.048 for outer layers and 0.024 for inner ones. This is the minimum that meets the rise, before process margin — leave another 20%–50% on the board, and check IPC-2152 for high-current or high-reliability work.",
  },
};

export function PcbTraceTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [current, setCurrent] = React.useState("3");
  const [deltaT, setDeltaT] = React.useState("10");
  const [copper, setCopper] = React.useState<CopperWeight>(1);
  const [layer, setLayer] = React.useState<LayerType>("external");
  const [length, setLength] = React.useState("50");
  const [width, setWidth] = React.useState("1");

  const solved = React.useMemo(
    () =>
      safe(() =>
        traceWidth({
          current: Number(current),
          deltaT: Number(deltaT),
          copperOz: copper,
          layer,
          lengthMm: Number(length),
        })
      ),
    [current, deltaT, copper, layer, length]
  );

  const inverse = React.useMemo(
    () => safe(() => traceCurrent(Number(width), copper, Number(deltaT), layer)),
    [width, copper, deltaT, layer]
  );

  const result = solved.value;

  const rows = result
    ? [
        { label: t.area, value: `${formatNumber(result.areaMil2, 5)} mil²` },
        { label: t.recommended, value: `${formatNumber(roundUpWidth(result.widthMm), 3)} mm` },
        { label: t.resistance, value: `${formatNumber(result.resistance, 4)} Ω` },
        { label: t.drop, value: `${formatNumber(result.voltageDrop * 1000, 4)} mV` },
        { label: t.loss, value: `${formatNumber(result.powerLoss * 1000, 4)} mW` },
      ]
    : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-foreground-subtle">{t.current}</span>
              <span className="flex items-center gap-1.5">
                <Input
                  value={current}
                  onChange={(event) => setCurrent(event.target.value)}
                  inputMode="decimal"
                  className="w-full font-mono text-sm"
                  size="xs"
                />
                <span className="w-5 shrink-0 font-mono text-[11px] text-foreground-faint">A</span>
              </span>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-foreground-subtle">{t.deltaT}</span>
              <span className="flex items-center gap-1.5">
                <Input
                  value={deltaT}
                  onChange={(event) => setDeltaT(event.target.value)}
                  inputMode="decimal"
                  className="w-full font-mono text-sm"
                  size="xs"
                />
                <span className="w-7 shrink-0 font-mono text-[11px] text-foreground-faint">°C</span>
              </span>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-foreground-subtle">{t.length}</span>
              <span className="flex items-center gap-1.5">
                <Input
                  value={length}
                  onChange={(event) => setLength(event.target.value)}
                  inputMode="decimal"
                  className="w-full font-mono text-sm"
                  size="xs"
                />
                <span className="w-7 shrink-0 font-mono text-[11px] text-foreground-faint">mm</span>
              </span>
              <span className="text-[10px] text-foreground-faint">{t.lengthHint}</span>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-foreground-subtle">{t.copper}</span>
              <Segmented
                ariaLabel={t.copper}
                value={String(copper) as "0.5" | "1" | "2" | "3"}
                onChange={(next) => setCopper(Number(next) as CopperWeight)}
                options={[
                  { value: "0.5", label: "0.5 oz" },
                  { value: "1", label: "1 oz" },
                  { value: "2", label: "2 oz" },
                  { value: "3", label: "3 oz" },
                ]}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-foreground-subtle">{t.layer}</span>
              <Segmented
                ariaLabel={t.layer}
                value={layer}
                onChange={setLayer}
                options={[
                  { value: "external", label: t.external },
                  { value: "internal", label: t.internal },
                ]}
              />
            </div>
          </div>

          {solved.error && <ErrorNote>{errorText(solved.error, locale)}</ErrorNote>}
        </div>

        <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-surface">
          <Pane
            label={t.result}
            footer={<span>{result ? `${formatNumber(result.widthMil, 4)} mil` : "—"}</span>}
          >
            {!result ? (
              <p className="px-3 py-6 text-[13px] text-foreground-faint">{t.empty}</p>
            ) : (
              <div className="flex flex-col">
                <div className="flex items-start gap-2 px-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-2xl leading-tight text-foreground">
                      {formatNumber(result.widthMm, 4)} mm
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-foreground-faint">
                      {formatNumber(result.widthMil, 4)} mil · {formatNumber(result.thicknessMm, 4)} mm
                      copper
                    </div>
                  </div>
                  <CopyButton value={formatNumber(result.widthMm, 4)} size="icon-xs" />
                </div>
                <dl className="divide-y divide-border border-t border-border text-[12px]">
                  {rows.map((row) => (
                    <div key={row.label} className="flex items-center gap-3 px-3 py-2">
                      <dt className="text-foreground-subtle">{row.label}</dt>
                      <dd className="ml-auto font-mono text-foreground">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </Pane>
        </div>
      </div>

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex h-10 items-center gap-2 border-b border-border px-3">
          <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
            {t.inverse}
          </span>
        </header>
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <label className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-foreground-subtle">{t.width}</span>
            <Input
              value={width}
              onChange={(event) => setWidth(event.target.value)}
              inputMode="decimal"
              className="w-24 font-mono text-sm"
              size="xs"
            />
            <span className="font-mono text-[11px] text-foreground-faint">mm</span>
          </label>
          <span className="font-mono text-[11px] text-foreground-subtle">→</span>
          <span className="font-mono text-sm text-foreground">
            {inverse.value !== null ? `${formatNumber(inverse.value, 4)} A` : "—"}
          </span>
          {inverse.value !== null && <CopyButton value={formatNumber(inverse.value, 4)} size="icon-xs" />}
          {inverse.error && <ErrorNote>{errorText(inverse.error, locale)}</ErrorNote>}
        </div>
      </section>

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}

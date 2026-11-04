"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { CopyButton, ErrorNote, Pane, Toggle } from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { errorText, safe } from "@/lib/errors";
import { voltageDivider, type DividerResult } from "@/lib/circuit";
import { formatNumber } from "@/lib/units";

const COPY = {
  zh: {
    vin: "输入电压",
    r1: "上臂电阻 R1",
    r2: "下臂电阻 R2",
    load: "负载电阻",
    withLoad: "接负载",
    result: "输出电压",
    ratio: "分压比",
    current: "回路电流",
    power: "功耗",
    r1Power: "R1 上",
    r2Power: "R2 上",
    loadCurrent: "负载电流",
    total: "总功耗",
    lowSide: "下臂等效",
    warning: "负载把下臂拉低，输出比空载时低",
    empty: "填入三个电阻（或关掉负载），这里给出分压结果",
    note: "空载时 Vout = Vin × R2 / (R1 + R2)，接上负载后 R2 与 RL 并联再参与分压。想减小负载影响，就把 R1、R2 取小一些，代价是静态电流变大。",
  },
  en: {
    vin: "Input voltage",
    r1: "Top resistor R1",
    r2: "Bottom resistor R2",
    load: "Load resistance",
    withLoad: "Add a load",
    result: "Output voltage",
    ratio: "Ratio",
    current: "Divider current",
    power: "Dissipation",
    r1Power: "In R1",
    r2Power: "In R2",
    loadCurrent: "Load current",
    total: "Total",
    lowSide: "Lower leg",
    warning: "The load pulls the lower leg down, so Vout sags below the unloaded value",
    empty: "Enter the resistors (or switch the load off) to see the divider output",
    note: "Unloaded, Vout = Vin × R2 / (R1 + R2); with a load, R2 sits in parallel with RL before dividing. Smaller resistors reduce the load's effect at the cost of a larger standing current.",
  },
};

function Resistor({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <g>
      <rect
        x={x - 12}
        y={y}
        width={24}
        height={44}
        rx={3}
        className="fill-surface stroke-border-strong"
        strokeWidth={1.4}
      />
      <text x={x + 20} y={y + 28} fontSize={11} className="fill-foreground-subtle">
        {label}
      </text>
    </g>
  );
}

function Schematics({ result, withLoad }: { result: DividerResult | null; withLoad: boolean }) {
  return (
    <svg viewBox="0 0 260 250" className="h-auto w-full max-w-[260px]" role="img" aria-label="divider">
      <line x1={70} y1={30} x2={200} y2={30} className="stroke-border-strong" strokeWidth={1.4} />
      <line x1={110} y1={30} x2={110} y2={56} className="stroke-border-strong" strokeWidth={1.4} />
      <Resistor x={110} y={56} label="R1" />
      <line x1={110} y1={100} x2={110} y2={140} className="stroke-border-strong" strokeWidth={1.4} />
      <Resistor x={110} y={140} label="R2" />
      <line x1={110} y1={184} x2={110} y2={214} className="stroke-border-strong" strokeWidth={1.4} />
      <line x1={94} y1={214} x2={126} y2={214} className="stroke-border-strong" strokeWidth={1.4} />
      <line x1={99} y1={220} x2={121} y2={220} className="stroke-border-strong" strokeWidth={1.4} />
      <line x1={104} y1={226} x2={116} y2={226} className="stroke-border-strong" strokeWidth={1.4} />

      <line x1={110} y1={120} x2={186} y2={120} className="stroke-accent" strokeWidth={1.4} />
      <circle cx={110} cy={120} r={2.6} className="fill-accent" />
      <text x={150} y={112} fontSize={11} className="fill-foreground-muted">
        Vout
      </text>
      <text x={192} y={124} fontSize={11} className="fill-foreground-muted">
        {result ? `${formatNumber(result.vout, 4)} V` : "—"}
      </text>

      <text x={16} y={34} fontSize={11} className="fill-foreground-subtle">
        Vin
      </text>
      <text x={16} y={48} fontSize={11} className="fill-foreground-faint">
        {withLoad ? "loaded" : "open"}
      </text>

      {withLoad && (
        <g>
          <line x1={110} y1={120} x2={226} y2={120} className="stroke-border-strong" strokeWidth={1.4} />
          <Resistor x={226} y={128} label="RL" />
          <line x1={226} y1={172} x2={226} y2={214} className="stroke-border-strong" strokeWidth={1.4} />
          <line x1={226} y1={214} x2={110} y2={214} className="stroke-border-strong" strokeWidth={1.4} />
        </g>
      )}
    </svg>
  );
}

export function VoltageDividerTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [vin, setVin] = React.useState("12");
  const [r1, setR1] = React.useState("10000");
  const [r2, setR2] = React.useState("10000");
  const [load, setLoad] = React.useState("100000");
  const [withLoad, setWithLoad] = React.useState(false);

  const solved = React.useMemo(
    () =>
      safe(() =>
        voltageDivider({
          vin: Number(vin),
          r1: Number(r1),
          r2: Number(r2),
          load: withLoad ? Number(load) : null,
        })
      ),
    [vin, r1, r2, load, withLoad]
  );

  const result = solved.value;
  const openCircuit = React.useMemo(
    () => safe(() => voltageDivider({ vin: Number(vin), r1: Number(r1), r2: Number(r2) })),
    [vin, r1, r2]
  );

  const sag =
    result && openCircuit.value && withLoad
      ? Math.abs(openCircuit.value.vout - result.vout) > 1e-9
      : false;

  const rows = result
    ? [
        { label: t.ratio, value: `${formatNumber(result.ratio * 100, 4)} %` },
        { label: t.current, value: `${formatNumber(result.current * 1000, 4)} mA` },
        { label: t.lowSide, value: `${formatNumber(result.lowerLeg, 5)} Ω` },
        { label: t.r1Power, value: `${formatNumber(result.r1Power * 1000, 4)} mW` },
        { label: t.r2Power, value: `${formatNumber(result.r2Power * 1000, 4)} mW` },
        ...(withLoad
          ? [
              { label: t.loadCurrent, value: `${formatNumber(result.loadCurrent * 1000, 4)} mA` },
              { label: t.total, value: `${formatNumber(result.totalPower * 1000, 4)} mW` },
            ]
          : []),
      ]
    : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-foreground-subtle">{t.vin}</span>
              <span className="flex items-center gap-1.5">
                <Input
                  value={vin}
                  onChange={(event) => setVin(event.target.value)}
                  inputMode="decimal"
                  className="w-full font-mono text-sm"
                  size="xs"
                />
                <span className="w-6 shrink-0 font-mono text-[11px] text-foreground-faint">V</span>
              </span>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-foreground-subtle">{t.r1}</span>
              <span className="flex items-center gap-1.5">
                <Input
                  value={r1}
                  onChange={(event) => setR1(event.target.value)}
                  inputMode="decimal"
                  className="w-full font-mono text-sm"
                  size="xs"
                />
                <span className="w-6 shrink-0 font-mono text-[11px] text-foreground-faint">Ω</span>
              </span>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-foreground-subtle">{t.r2}</span>
              <span className="flex items-center gap-1.5">
                <Input
                  value={r2}
                  onChange={(event) => setR2(event.target.value)}
                  inputMode="decimal"
                  className="w-full font-mono text-sm"
                  size="xs"
                />
                <span className="w-6 shrink-0 font-mono text-[11px] text-foreground-faint">Ω</span>
              </span>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-foreground-subtle">{t.load}</span>
              <span className="flex items-center gap-1.5">
                <Input
                  value={load}
                  onChange={(event) => setLoad(event.target.value)}
                  inputMode="decimal"
                  disabled={!withLoad}
                  className="w-full font-mono text-sm disabled:opacity-50"
                  size="xs"
                />
                <span className="w-6 shrink-0 font-mono text-[11px] text-foreground-faint">Ω</span>
              </span>
            </label>
          </div>
          <Toggle checked={withLoad} onChange={setWithLoad} label={t.withLoad} />
          {solved.error && <ErrorNote>{errorText(solved.error, locale)}</ErrorNote>}
        </div>

        <div className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-surface">
          <Pane
            label={t.result}
            footer={<span>{result ? `${formatNumber(result.vout, 6)} V` : "—"}</span>}
          >
            {!result ? (
              <p className="px-3 py-6 text-[13px] text-foreground-faint">{t.empty}</p>
            ) : (
              <div className="flex flex-col">
                <div className="flex items-start gap-2 px-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-2xl leading-tight text-foreground">
                      {formatNumber(result.vout, 6)} V
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-foreground-faint">
                      {formatNumber(result.ratio * 100, 4)} % of {formatNumber(Number(vin), 4)} V
                    </div>
                  </div>
                  <CopyButton value={formatNumber(result.vout, 6)} size="icon-xs" />
                </div>
                <dl className="divide-y divide-border border-t border-border text-[12px]">
                  {rows.slice(1).map((row) => (
                    <div key={row.label} className="flex items-center gap-3 px-3 py-2">
                      <dt className="text-foreground-subtle">{row.label}</dt>
                      <dd className="ml-auto font-mono text-foreground">{row.value}</dd>
                    </div>
                  ))}
                </dl>
                {sag && (
                  <p className="border-t border-border px-3 py-2 text-[11px] leading-relaxed text-foreground-subtle">
                    {t.warning}
                  </p>
                )}
              </div>
            )}
          </Pane>
          <div className="flex justify-center border-t border-border px-3 py-3">
            <Schematics result={result} withLoad={withLoad} />
          </div>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}

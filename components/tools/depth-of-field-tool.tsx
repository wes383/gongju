"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CopyButton, ErrorNote, Pane } from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { errorText, safe } from "@/lib/errors";
import { depthOfField, SENSORS, type DofResult, type SensorId } from "@/lib/photo";
import { formatNumber } from "@/lib/units";

const COPY = {
  zh: {
    focal: "焦距",
    aperture: "光圈",
    distance: "对焦距离",
    sensor: "画幅",
    result: "景深",
    near: "近界",
    far: "远界",
    total: "景深范围",
    hyperfocal: "超焦距",
    coc: "弥散圆",
    equivalent: "等效焦距",
    infinity: "∞",
    empty: "填入焦距、光圈和对焦距离",
    barTitle: "清晰范围",
    hint: "对焦到超焦距后，从它的 1/2 到无穷远都在景深内，这是风景摄影常用的技巧。",
    note: "按常用景深公式计算：H = f² / (N·c) + f，近界 = s(H−f) / (H+s−2f)，远界 = s(H−f) / (H−s)。弥散圆取画幅对角线 1/1500，与常见景深表一致；放大到 100% 查看时实际观感会更浅。",
  },
  en: {
    focal: "Focal length",
    aperture: "Aperture",
    distance: "Focus distance",
    sensor: "Sensor",
    result: "Depth of field",
    near: "Near limit",
    far: "Far limit",
    total: "Total",
    hyperfocal: "Hyperfocal",
    coc: "Circle of confusion",
    equivalent: "35 mm equivalent",
    infinity: "∞",
    empty: "Enter a focal length, an aperture and a focus distance",
    barTitle: "Sharp range",
    hint: "Focus at the hyperfocal distance and everything from half of it to infinity is acceptably sharp — the classic landscape trick.",
    note: "Standard formulas: H = f² / (N·c) + f, near = s(H−f) / (H+s−2f), far = s(H−f) / (H−s). The circle of confusion is the sensor diagonal over 1500, which matches the usual DOF tables; pixel peeping at 100% will look softer.",
  },
};

function metres(value: number): string {
  if (!Number.isFinite(value)) return "∞";
  if (value >= 1000) return `${formatNumber(value / 1000, 3)} km`;
  return `${formatNumber(value, 3)} m`;
}

function DofBar({ dof, distance }: { dof: DofResult; distance: number }) {
  const width = 640;
  const height = 92;
  const left = 24;
  const right = 24;
  const plot = width - left - right;
  const farFinite = Number.isFinite(dof.far);
  const limit = farFinite
    ? Math.max(dof.near * 1.2, Math.min(dof.far * 1.15, distance * 3))
    : Math.max(distance * 2, dof.near * 1.5);
  const sx = (value: number) => left + (Math.min(value, limit) / limit) * plot;
  const y = 54;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="depth of field">
      <line x1={left} y1={y} x2={width - right} y2={y} className="stroke-border" strokeWidth={1} />
      <rect
        x={sx(dof.near)}
        y={y - 9}
        width={Math.max(2, sx(farFinite ? dof.far : limit) - sx(dof.near))}
        height={18}
        rx={3}
        className="fill-accent stroke-accent"
        fillOpacity={0.18}
        strokeWidth={1}
      />
      <line x1={sx(distance)} y1={y - 16} x2={sx(distance)} y2={y + 16} className="stroke-foreground" strokeWidth={1.4} />
      <circle cx={sx(distance)} cy={y} r={3} className="fill-foreground" />

      {[
        { x: sx(dof.near), label: metres(dof.near) },
        { x: sx(distance), label: metres(distance) },
        { x: sx(farFinite ? dof.far : limit), label: farFinite ? metres(dof.far) : "∞" },
      ].map((tick, index) => (
        <text
          key={index}
          x={Math.min(Math.max(tick.x, left), width - right)}
          y={y + 32}
          textAnchor={index === 0 ? "start" : index === 1 ? "middle" : "end"}
          fontSize={10}
          className="fill-foreground-subtle"
        >
          {tick.label}
        </text>
      ))}
    </svg>
  );
}

export function DepthOfFieldTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [focal, setFocal] = React.useState("50");
  const [aperture, setAperture] = React.useState("1.8");
  const [distance, setDistance] = React.useState("3");
  const [sensorId, setSensorId] = React.useState<SensorId>("full");

  const solved = React.useMemo(
    () =>
      safe(() =>
        depthOfField({
          focal: Number(focal),
          aperture: Number(aperture),
          distance: Number(distance),
          sensorId,
        })
      ),
    [focal, aperture, distance, sensorId]
  );

  const result = solved.value;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-foreground-subtle">{t.focal}</span>
              <span className="flex items-center gap-1.5">
                <Input
                  value={focal}
                  onChange={(event) => setFocal(event.target.value)}
                  inputMode="decimal"
                  className="w-full font-mono text-sm"
                  size="xs"
                />
                <span className="w-6 shrink-0 font-mono text-[11px] text-foreground-faint">mm</span>
              </span>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-foreground-subtle">{t.aperture}</span>
              <span className="flex items-center gap-1">
                <span className="font-mono text-[11px] text-foreground-faint">f/</span>
                <Input
                  value={aperture}
                  onChange={(event) => setAperture(event.target.value)}
                  inputMode="decimal"
                  className="w-full font-mono text-sm"
                  size="xs"
                />
              </span>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-foreground-subtle">{t.distance}</span>
              <span className="flex items-center gap-1.5">
                <Input
                  value={distance}
                  onChange={(event) => setDistance(event.target.value)}
                  inputMode="decimal"
                  className="w-full font-mono text-sm"
                  size="xs"
                />
                <span className="w-4 shrink-0 font-mono text-[11px] text-foreground-faint">m</span>
              </span>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-foreground-subtle">{t.sensor}</span>
              <Select value={sensorId} onValueChange={(value) => setSensorId(value as SensorId)}>
                <SelectTrigger size="xs" aria-label={t.sensor} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SENSORS.map((sensor) => (
                    <SelectItem key={sensor.id} value={sensor.id}>
                      {sensor.name[locale]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>
          {solved.error && <ErrorNote>{errorText(solved.error, locale)}</ErrorNote>}
        </div>

        <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-surface">
          <Pane
            label={t.result}
            footer={<span>{result ? `${metres(result.near)} – ${metres(result.far)}` : "—"}</span>}
          >
            {!result ? (
              <p className="px-3 py-6 text-[13px] text-foreground-faint">{t.empty}</p>
            ) : (
              <div className="flex flex-col">
                <div className="flex items-start gap-2 px-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-2xl leading-tight text-foreground">
                      {metres(result.total)}
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-foreground-faint">
                      {metres(result.near)} – {metres(result.far)}
                    </div>
                  </div>
                  <CopyButton value={Number.isFinite(result.total) ? formatNumber(result.total, 3) : "∞"} size="icon-xs" />
                </div>
                <dl className="divide-y divide-border border-t border-border text-[12px]">
                  {[
                    { label: t.near, value: metres(result.near) },
                    { label: t.far, value: metres(result.far) },
                    { label: t.hyperfocal, value: metres(result.hyperfocal) },
                    { label: t.coc, value: `${formatNumber(result.coc, 3)} mm` },
                    { label: t.equivalent, value: `${formatNumber(result.equivalent, 4)} mm` },
                  ].map((row) => (
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
            {t.barTitle}
          </span>
        </header>
        <div className="px-4 py-3">
          {result && <DofBar dof={result} distance={Number(distance)} />}
          <p className="mt-2 text-[11px] leading-relaxed text-foreground-subtle">{t.hint}</p>
        </div>
      </section>

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}

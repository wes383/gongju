"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { CopyButton, ErrorNote, Pane } from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { errorText, safe } from "@/lib/errors";
import { exposureValue, formatShutter, parseShutter, shutterFor } from "@/lib/photo";
import { formatNumber } from "@/lib/units";

const APERTURES = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22];
const ISOS = [100, 200, 400, 800, 1600, 3200, 6400];

const COPY = {
  zh: {
    iso: "感光度",
    aperture: "光圈",
    shutter: "快门",
    shutterHint: "可以写 1/125、0.008 或 2",
    result: "曝光值",
    ev: "EV（当前设置）",
    ev100: "EV100（场景亮度）",
    equivalent: "等效曝光",
    equivalentHint: "保持 EV 不变时，各档光圈对应的快门速度",
    current: "当前",
    brighter: "亮一档",
    darker: "暗一档",
    empty: "填入感光度、光圈和快门",
    note: "EV = log₂(N² / t)，只由光圈和快门决定；EV100 再去掉 ISO 的影响，用来描述场景亮度（晴天约 15，室内约 5–8）。表格里每一行的曝光量都与当前设置相同，可以据此平移光圈和快门。",
  },
  en: {
    iso: "ISO",
    aperture: "Aperture",
    shutter: "Shutter",
    shutterHint: "1/125, 0.008 and 2 all work",
    result: "Exposure",
    ev: "EV (settings)",
    ev100: "EV100 (scene)",
    equivalent: "Equivalent exposures",
    equivalentHint: "Shutter speeds that keep the same EV at each aperture",
    current: "current",
    brighter: "1 stop brighter",
    darker: "1 stop darker",
    empty: "Enter an ISO, an aperture and a shutter speed",
    note: "EV = log₂(N² / t) depends only on aperture and shutter; EV100 removes the ISO so it describes the scene instead (about 15 in sun, 5–8 indoors). Every row of the table has the same exposure as the current settings, so you can trade aperture against shutter.",
  },
};

export function ExposureTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [iso, setIso] = React.useState("100");
  const [aperture, setAperture] = React.useState("2.8");
  const [shutter, setShutter] = React.useState("1/500");

  const solved = React.useMemo(
    () =>
      safe(() =>
        exposureValue({
          aperture: Number(aperture),
          shutter: parseShutter(shutter),
          iso: Number(iso),
        })
      ),
    [aperture, shutter, iso]
  );

  const result = solved.value;
  const currentAperture = Number(aperture);

  const rows = React.useMemo(() => {
    if (!result) return [];
    return APERTURES.map((f) => {
      const seconds = safe(() => shutterFor(result.ev, f));
      return { aperture: f, shutter: seconds.value, error: seconds.error };
    });
  }, [result]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-foreground-subtle">{t.iso}</span>
              <Input
                value={iso}
                onChange={(event) => setIso(event.target.value)}
                inputMode="numeric"
                className="w-full font-mono text-sm"
                size="xs"
              />
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
              <span className="text-[11px] font-medium text-foreground-subtle">{t.shutter}</span>
              <Input
                value={shutter}
                onChange={(event) => setShutter(event.target.value)}
                className="w-full font-mono text-sm"
                size="xs"
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {ISOS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setIso(String(value))}
                className="rounded-full border border-border px-2 py-0.5 font-mono text-[11px] text-foreground-muted transition-colors duration-base ease-out hover:bg-hover-bg hover:text-foreground"
              >
                {value}
              </button>
            ))}
          </div>
          <p className="text-[11px] leading-relaxed text-foreground-subtle">{t.shutterHint}</p>
          {solved.error && <ErrorNote>{errorText(solved.error, locale)}</ErrorNote>}
        </div>

        <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-surface">
          <Pane
            label={t.result}
            footer={<span>{result ? `EV ${formatNumber(result.ev, 3)}` : "—"}</span>}
          >
            {!result ? (
              <p className="px-3 py-6 text-[13px] text-foreground-faint">{t.empty}</p>
            ) : (
              <div className="flex flex-col">
                <div className="flex items-start gap-2 px-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-2xl leading-tight text-foreground">
                      EV {formatNumber(result.ev, 2)}
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-foreground-faint">
                      EV100 {formatNumber(result.ev100, 2)}
                    </div>
                  </div>
                  <CopyButton value={formatNumber(result.ev, 2)} size="icon-xs" />
                </div>
                <dl className="divide-y divide-border border-t border-border text-[12px]">
                  {[
                    { label: t.ev, value: formatNumber(result.ev, 2) },
                    { label: t.ev100, value: formatNumber(result.ev100, 2) },
                    {
                      label: t.brighter,
                      value: formatShutter(parseShutter(shutter) * 2),
                    },
                    {
                      label: t.darker,
                      value: formatShutter(parseShutter(shutter) / 2),
                    },
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
            {t.equivalent}
          </span>
          <span className="ml-auto text-[11px] text-foreground-faint">{t.equivalentHint}</span>
        </header>
        <ul className="divide-y divide-border">
          {rows.map((row) => {
            const active = Math.abs(row.aperture - currentAperture) < 0.05;
            return (
              <li
                key={row.aperture}
                className={
                  active
                    ? "flex items-center gap-3 bg-hover-bg px-4 py-2"
                    : "flex items-center gap-3 px-4 py-2"
                }
              >
                <span className="w-16 font-mono text-[12px] text-foreground-muted">
                  f/{row.aperture}
                </span>
                <span className="font-mono text-[13px] text-foreground">
                  {row.shutter === null ? "—" : formatShutter(row.shutter)}
                </span>
                {active && (
                  <span className="ml-auto font-mono text-[10px] uppercase tracking-wide text-accent">
                    {t.current}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}

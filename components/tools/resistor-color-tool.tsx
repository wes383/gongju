"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { CopyButton, ErrorNote, Pane, Segmented } from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { errorText, safe } from "@/lib/errors";
import {
  BAND_COUNTS,
  bandColor,
  colorsForSlot,
  decodeBands,
  encodeValue,
  formatOhms,
  type BandColorId,
  type BandCount,
} from "@/lib/resistor";
import { cn } from "@/lib/utils";

type Slot = "digit" | "multiplier" | "tolerance" | "tempco";

function slotsFor(count: BandCount): Slot[] {
  const digits: Slot[] = count === 4 ? ["digit", "digit"] : ["digit", "digit", "digit"];
  return [...digits, "multiplier", "tolerance", ...(count === 6 ? (["tempco"] as Slot[]) : [])];
}

const COPY = {
  zh: {
    mode: "模式",
    decode: "色环 → 阻值",
    encode: "阻值 → 色环",
    bands: "环数",
    band: (n: number) => `第 ${n} 环`,
    slots: { digit: "数字", multiplier: "乘数", tolerance: "误差", tempco: "温度系数" } as Record<
      Slot,
      string
    >,
    result: "阻值",
    range: "范围",
    expression: "读法",
    tolerance: "误差",
    tempco: "温度系数",
    value: "阻值",
    unit: "单位",
    units: { ohm: "Ω", kohm: "kΩ", mohm: "MΩ" },
    tolerancePick: "误差",
    bandsOut: "对应色环",
    achieved: "实际阻值",
    rounded: (diff: string) => `色环只能表示这个值，与输入的阻值相差 ${diff}`,
    empty: "选好每一环的颜色，右边会读出阻值",
    advice: "常见 4 环为两位有效数字，5 环和 6 环为三位；6 环的最后一环是温度系数。金、银只出现在乘数位与误差位。",
    note: "色环读数按 IEC 60062：数字环直接拼成有效数字，乘数环给出 10 的幂，误差环为百分比。全部在浏览器内计算。",
  },
  en: {
    mode: "Mode",
    decode: "Bands → value",
    encode: "Value → bands",
    bands: "Bands",
    band: (n: number) => `Band ${n}`,
    slots: { digit: "digit", multiplier: "multiplier", tolerance: "tolerance", tempco: "tempco" } as Record<
      Slot,
      string
    >,
    result: "Resistance",
    range: "Range",
    expression: "Reading",
    tolerance: "Tolerance",
    tempco: "Tempco",
    value: "Resistance",
    unit: "Unit",
    units: { ohm: "Ω", kohm: "kΩ", mohm: "MΩ" },
    tolerancePick: "Tolerance",
    bandsOut: "Bands",
    achieved: "Actual value",
    rounded: (diff: string) => `The bands can only spell this value — ${diff} away from what you entered`,
    empty: "Pick a colour for every band to read the value",
    advice: "4-band parts carry two significant digits, 5 and 6-band parts three; the last band of a 6-band part is the temperature coefficient. Gold and silver only appear in the multiplier and tolerance slots.",
    note: "Readings follow IEC 60062: digit bands spell the significant figures, the multiplier band is its power of ten and the tolerance band is a percentage. Everything runs in your browser.",
  },
};

const UNIT_FACTOR: Record<string, number> = { ohm: 1, kohm: 1e3, mohm: 1e6 };

function Swatch({
  color,
  active,
  onPick,
}: {
  color: BandColorId;
  active: boolean;
  onPick: () => void;
}) {
  const locale = useLocale();
  const band = bandColor(color);
  const label = band.name[locale];
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={cn(
        "h-6 w-6 rounded-full border transition-transform duration-base ease-out",
        active
          ? "border-foreground ring-2 ring-foreground/25"
          : "border-border hover:scale-110",
        band.id === "white" && "border-border-strong"
      )}
      style={{ backgroundColor: band.hex }}
    />
  );
}

export function ResistorColorTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [mode, setMode] = React.useState<"decode" | "encode">("decode");
  const [bands, setBands] = React.useState<BandCount>(4);
  const [picked, setPicked] = React.useState<BandColorId[]>([
    "brown",
    "black",
    "red",
    "gold",
  ]);
  const [value, setValue] = React.useState("4700");
  const [unit, setUnit] = React.useState<"ohm" | "kohm" | "mohm">("ohm");
  const [tolerance, setTolerance] = React.useState("0.01");

  const slots = slotsFor(bands);

  const changeBands = (next: BandCount) => {
    setBands(next);
    setPicked((current) => {
      const target = slotsFor(next);
      const colorsForNext = target.map((slot, i) => {
        const existing = current[i];
        if (existing && colorsForSlot(slot).some((color) => color.id === existing)) return existing;
        if (slot === "tolerance") return "gold" as BandColorId;
        if (slot === "multiplier") return "brown" as BandColorId;
        if (slot === "tempco") return "brown" as BandColorId;
        return "black" as BandColorId;
      });
      return colorsForNext;
    });
  };

  const decoded = React.useMemo(() => safe(() => decodeBands(picked.slice(0, bands))), [picked, bands]);
  const encoded = React.useMemo(
    () =>
      safe(() =>
        encodeValue(Number(value) * UNIT_FACTOR[unit], {
          bands,
          tolerance: Number(tolerance),
        })
      ),
    [value, unit, bands, tolerance]
  );

  const activeError = mode === "decode" ? decoded.error : encoded.error;
  const decodedValue = decoded.value;
  const encodedValue = encoded.value;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <Segmented
          ariaLabel={t.mode}
          value={mode}
          onChange={setMode}
          options={[
            { value: "decode", label: t.decode },
            { value: "encode", label: t.encode },
          ]}
        />
        <Segmented
          ariaLabel={t.bands}
          value={String(bands) as "4" | "5" | "6"}
          onChange={(next) => changeBands(Number(next) as BandCount)}
          options={BAND_COUNTS.map((count) => ({ value: String(count) as "4" | "5" | "6", label: `${count}` }))}
        />
        <span className="text-xs text-foreground-subtle">{t.bands}</span>
      </div>

      {mode === "decode" ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3">
            {slots.map((slot, index) => (
              <div key={`${slot}-${index}`} className="flex flex-col gap-1.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-[11px] font-medium text-foreground-subtle">
                    {t.band(index + 1)}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-wide text-foreground-faint">
                    {t.slots[slot]}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {colorsForSlot(slot).map((color) => (
                    <Swatch
                      key={color.id}
                      color={color.id}
                      active={picked[index] === color.id}
                      onPick={() =>
                        setPicked((current) =>
                          current.map((item, i) => (i === index ? color.id : item))
                        )
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
            {activeError && <ErrorNote>{errorText(activeError, locale)}</ErrorNote>}
          </div>

          <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-surface">
            <Pane
              label={t.result}
              footer={
                <span>
                  {decodedValue ? formatOhms(decodedValue.ohms) : "—"}
                </span>
              }
            >
              {!decodedValue ? (
                <p className="px-3 py-6 text-[13px] text-foreground-faint">{t.empty}</p>
              ) : (
                <div className="flex flex-col">
                  <div className="flex items-start gap-2 px-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-2xl leading-tight text-foreground">
                        {formatOhms(decodedValue.ohms)}
                      </div>
                      <div className="mt-1 font-mono text-[11px] text-foreground-faint">
                        {decodedValue.expression}
                      </div>
                    </div>
                    <CopyButton value={String(decodedValue.ohms)} size="icon-xs" />
                  </div>
                  <dl className="divide-y divide-border border-t border-border text-[12px]">
                    {decodedValue.tolerance !== null && (
                      <div className="flex items-center gap-3 px-3 py-2">
                        <dt className="text-foreground-subtle">{t.tolerance}</dt>
                        <dd className="ml-auto font-mono text-foreground">
                          ±{(decodedValue.tolerance * 100).toLocaleString("en-US")}%
                        </dd>
                      </div>
                    )}
                    {decodedValue.min !== null && decodedValue.max !== null && (
                      <div className="flex items-center gap-3 px-3 py-2">
                        <dt className="text-foreground-subtle">{t.range}</dt>
                        <dd className="ml-auto font-mono text-foreground">
                          {formatOhms(decodedValue.min)} – {formatOhms(decodedValue.max)}
                        </dd>
                      </div>
                    )}
                    {decodedValue.tempco !== null && (
                      <div className="flex items-center gap-3 px-3 py-2">
                        <dt className="text-foreground-subtle">{t.tempco}</dt>
                        <dd className="ml-auto font-mono text-foreground">
                          {decodedValue.tempco} ppm/K
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}
            </Pane>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3">
            <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-foreground-subtle">{t.value}</span>
                <span className="flex items-center gap-1.5">
                  <Input
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    inputMode="decimal"
                    className="w-32 font-mono text-sm"
                    size="xs"
                  />
                  <Segmented
                    ariaLabel={t.unit}
                    value={unit}
                    onChange={setUnit}
                    options={[
                      { value: "ohm", label: t.units.ohm },
                      { value: "kohm", label: t.units.kohm },
                      { value: "mohm", label: t.units.mohm },
                    ]}
                  />
                </span>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-foreground-subtle">
                  {t.tolerancePick}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {colorsForSlot("tolerance").map((color) => (
                    <Swatch
                      key={color.id}
                      color={color.id}
                      active={Math.abs(Number(tolerance) - (color.tolerance ?? 0)) < 1e-9}
                      onPick={() => setTolerance(String(color.tolerance))}
                    />
                  ))}
                </div>
              </label>
            </div>
            {activeError && <ErrorNote>{errorText(activeError, locale)}</ErrorNote>}
          </div>

          <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-surface">
            <Pane
              label={t.bandsOut}
              footer={<span>{encodedValue ? formatOhms(encodedValue.ohms) : "—"}</span>}
            >
              {!encodedValue ? (
                <p className="px-3 py-6 text-[13px] text-foreground-faint">{t.empty}</p>
              ) : (
                <div className="flex flex-col gap-3 px-3 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {encodedValue.colors.map((color, index) => (
                      <div key={`${color}-${index}`} className="flex flex-col items-center gap-1">
                        <span
                          className="h-7 w-7 rounded-full border border-border"
                          style={{ backgroundColor: bandColor(color).hex }}
                        />
                        <span className="font-mono text-[10px] text-foreground-faint">
                          {bandColor(color).name[locale]}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-xl text-foreground">
                      {formatOhms(encodedValue.ohms)}
                    </span>
                    <CopyButton value={String(encodedValue.ohms)} size="icon-xs" />
                  </div>
                  <p className="text-[11px] leading-relaxed text-foreground-subtle">
                    {encodedValue.exact
                      ? `${t.tolerance} ±${(encodedValue.tolerance * 100).toLocaleString("en-US")}%`
                      : t.rounded(
                          formatOhms(Math.abs(encodedValue.ohms - Number(value) * UNIT_FACTOR[unit]))
                        )}
                  </p>
                </div>
              )}
            </Pane>
          </div>
        </div>
      )}

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.advice}</p>
      <p className="text-[11px] leading-relaxed text-foreground-faint">{t.note}</p>
    </div>
  );
}

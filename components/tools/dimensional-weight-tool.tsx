"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CopyButton, ErrorNote, Pane } from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { errorText, safe } from "@/lib/errors";
import { parcelCharge, type ParcelInput } from "@/lib/shipping";

const COPY = {
  zh: {
    size: "包裹尺寸（厘米）",
    length: "长",
    width: "宽",
    height: "高",
    actual: "实重（千克）",
    divisor: "体积重除数",
    divisorHint: "快递多为 6000，空运 5000，部分专线用 8000",
    round: "计费进位",
    rate: "运费单价（元/千克）",
    result: "计费重量",
    empty: "填入尺寸与实重后这里给出计费重",
    volumetric: "体积重",
    actualRow: "实重",
    volume: "体积",
    ratio: "抛货比",
    cost: "运费",
    byVolume: "按体积重计费",
    byWeight: "按实重计费",
    kg: "kg",
    cm3: "cm³",
    note: "体积重 = 长 × 宽 × 高 ÷ 除数，计费重取体积重和实重里大的那个，再按快递公司的进位规则向上取整（0.5 千克或 1 千克一档）。抛货比大于 1 说明包裹「占地方不占分量」，压缩包装比谈价格更能省钱。实际计费还要看首重续重、偏远附加和燃油费，这里算的是基础运费。",
    none: "—",
  },
  en: {
    size: "Box size (cm)",
    length: "L",
    width: "W",
    height: "H",
    actual: "Actual weight (kg)",
    divisor: "Volumetric divisor",
    divisorHint: "6000 for most express, 5000 for air freight, 8000 for some lines",
    round: "Billing step",
    rate: "Freight rate (per kg)",
    result: "Chargeable weight",
    empty: "Enter the box and weight to see the chargeable weight",
    volumetric: "Volumetric weight",
    actualRow: "Actual weight",
    volume: "Volume",
    ratio: "Volume ratio",
    cost: "Freight",
    byVolume: "Billed on volume",
    byWeight: "Billed on weight",
    kg: "kg",
    cm3: "cm³",
    note: "Volumetric weight is length × width × height ÷ divisor, and the chargeable weight is the larger of that and the scale weight, rounded up to the courier's billing step (0.5 or 1 kg). A ratio above 1 means the parcel is bulky for its weight — shrinking the packaging saves more than haggling on rate. Real invoices also add first-kilo pricing, remote-area surcharges and fuel, so this is the base freight only.",
    none: "—",
  },
};

const DIVISORS = [5000, 6000, 8000];
const STEPS = [0.1, 0.5, 1];

const kg = (value: number) =>
  value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 3 });

export function DimensionalWeightTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [length, setLength] = React.useState("50");
  const [width, setWidth] = React.useState("40");
  const [height, setHeight] = React.useState("30");
  const [actual, setActual] = React.useState("8");
  const [divisor, setDivisor] = React.useState("6000");
  const [step, setStep] = React.useState("0.5");
  const [rate, setRate] = React.useState("12");

  const solved = React.useMemo(() => {
    const input: ParcelInput = {
      lengthCm: Number(length),
      widthCm: Number(width),
      heightCm: Number(height),
      actualKg: Number(actual),
      divisor: Number(divisor),
      roundTo: Number(step),
      ratePerKg: Number(rate),
    };
    return safe(() => parcelCharge(input));
  }, [length, width, height, actual, divisor, step, rate]);

  const result = solved.value;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          <div>
            <div className="mb-1 text-[11px] font-medium text-foreground-subtle">{t.size}</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: t.length, value: length, set: setLength },
                { label: t.width, value: width, set: setWidth },
                { label: t.height, value: height, set: setHeight },
              ].map((field) => (
                <label key={field.label} className="flex items-center gap-1.5">
                  <span className="w-3 shrink-0 text-[11px] text-foreground-faint">{field.label}</span>
                  <Input
                    value={field.value}
                    onChange={(event) => field.set(event.target.value)}
                    inputMode="decimal"
                    className="w-full font-mono text-sm"
                    size="xs"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-foreground-subtle">{t.actual}</span>
              <Input
                value={actual}
                onChange={(event) => setActual(event.target.value)}
                inputMode="decimal"
                className="w-full font-mono text-sm"
                size="xs"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-foreground-subtle" title={t.divisorHint}>
                {t.divisor}
              </span>
              <Select value={divisor} onValueChange={setDivisor}>
                <SelectTrigger size="xs" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIVISORS.map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-foreground-subtle">{t.round}</span>
              <Select value={step} onValueChange={setStep}>
                <SelectTrigger size="xs" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STEPS.map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value} {t.kg}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-foreground-subtle">{t.rate}</span>
              <Input
                value={rate}
                onChange={(event) => setRate(event.target.value)}
                inputMode="decimal"
                className="w-full font-mono text-sm"
                size="xs"
              />
            </label>
          </div>

          {solved.error && <ErrorNote>{errorText(solved.error, locale)}</ErrorNote>}
        </div>

        <div className="min-w-0 self-start overflow-hidden rounded-lg border border-border bg-surface">
          <Pane
            label={t.result}
            footer={
              <span>
                {t.cost} {result?.cost == null ? t.none : `¥${result.cost.toFixed(2)}`}
              </span>
            }
          >
            {!result ? (
              <p className="px-3 py-6 text-[13px] text-foreground-faint">{t.empty}</p>
            ) : (
              <div className="flex flex-col">
                <div className="flex items-start gap-2 border-b border-border px-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-2xl leading-tight text-foreground">
                        {kg(result.billedKg)}
                      </span>
                      <span className="text-[11px] text-foreground-faint">{t.kg}</span>
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-foreground-faint">
                      {result.byVolume ? t.byVolume : t.byWeight}
                    </div>
                  </div>
                  <CopyButton value={String(result.billedKg)} size="icon-xs" />
                </div>

                <dl className="divide-y divide-border text-[12px]">
                  <div className="flex items-center gap-3 px-3 py-2">
                    <dt className="text-foreground-subtle">{t.volumetric}</dt>
                    <dd className="ml-auto font-mono text-foreground">
                      {kg(result.volumetricKg)} {t.kg}
                    </dd>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2">
                    <dt className="text-foreground-subtle">{t.actualRow}</dt>
                    <dd className="ml-auto font-mono text-foreground-muted">
                      {kg(Number(actual))} {t.kg}
                    </dd>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2">
                    <dt className="text-foreground-subtle">{t.volume}</dt>
                    <dd className="ml-auto font-mono text-foreground-muted">
                      {kg(result.volumeCm3)} {t.cm3}
                    </dd>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2">
                    <dt className="text-foreground-subtle">{t.ratio}</dt>
                    <dd
                      className={
                        result.byVolume
                          ? "ml-auto font-mono text-orange-fg"
                          : "ml-auto font-mono text-foreground-muted"
                      }
                    >
                      {result.ratio === null ? t.none : `${result.ratio.toFixed(2)}×`}
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </Pane>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}

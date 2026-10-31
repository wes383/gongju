"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CopyButton, Segmented } from "@/components/tools/tool-ui";
import { useCopy } from "@/components/locale-provider";
import {
  BMI_BANDS,
  bmi,
  bmiCategory,
  healthyWeightRange,
  type BmiCategoryId,
  type BmiStandard,
} from "@/lib/calc";
import { cn } from "@/lib/utils";

const COPY = {
  zh: {
    units: "单位",
    metric: "公制",
    imperial: "英制",
    standard: "标准",
    who: "WHO",
    cn: "中国",
    height: "身高",
    weight: "体重",
    cm: "厘米",
    kg: "千克",
    ft: "英尺",
    in: "英寸",
    lb: "磅",
    result: "BMI",
    category: "区间",
    healthy: "正常范围",
    bands: "分级",
    invalid: "请输入身高和体重",
    categories: {
      underweight: "偏瘦",
      normal: "正常",
      overweight: "超重",
      obese1: "肥胖 I",
      obese2: "肥胖 II",
      obese3: "肥胖 III",
    } as Record<BmiCategoryId, string>,
    obese: "肥胖",
    note: "BMI = 体重(kg) ÷ 身高(m)²。WHO 与中国标准（WS/T 428-2013）的超重、肥胖阈值不同，切换标准即可对照；BMI 不区分肌肉与脂肪，仅作粗略参考。",
    range: (min: string, max: string) => `${min} – ${max} kg`,
  },
  en: {
    units: "Units",
    metric: "Metric",
    imperial: "Imperial",
    standard: "Standard",
    who: "WHO",
    cn: "China",
    height: "Height",
    weight: "Weight",
    cm: "cm",
    kg: "kg",
    ft: "ft",
    in: "in",
    lb: "lb",
    result: "BMI",
    category: "Band",
    healthy: "Healthy range",
    bands: "Bands",
    invalid: "Enter a height and a weight",
    categories: {
      underweight: "Underweight",
      normal: "Normal",
      overweight: "Overweight",
      obese1: "Obese I",
      obese2: "Obese II",
      obese3: "Obese III",
    } as Record<BmiCategoryId, string>,
    obese: "Obese",
    note: "BMI = weight (kg) ÷ height (m)². The WHO and Chinese (WS/T 428-2013) cut-offs differ for overweight and obesity — switch the standard to compare. BMI cannot tell muscle from fat, so treat it as a rough guide.",
    range: (min: string, max: string) => `${min} – ${max} kg`,
  },
};

const VARIANT: Record<BmiCategoryId, "success" | "warning" | "danger" | "info"> = {
  underweight: "info",
  normal: "success",
  overweight: "warning",
  obese1: "danger",
  obese2: "danger",
  obese3: "danger",
};

/** Bands shown in the table; the Chinese standard has no obesity sub-levels */
const SHOWN: Record<BmiStandard, BmiCategoryId[]> = {
  who: ["underweight", "normal", "overweight", "obese1", "obese2", "obese3"],
  cn: ["underweight", "normal", "overweight", "obese1"],
};

export function BmiTool() {
  const t = useCopy(COPY);
  const [system, setSystem] = React.useState<"metric" | "imperial">("metric");
  const [standard, setStandard] = React.useState<BmiStandard>("who");
  const [cm, setCm] = React.useState("170");
  const [kg, setKg] = React.useState("65");
  const [ft, setFt] = React.useState("5");
  const [inch, setInch] = React.useState("7");
  const [lb, setLb] = React.useState("143");

  const heightCm =
    system === "metric" ? Number(cm) : Number(ft) * 30.48 + Number(inch) * 2.54;
  const weightKg = system === "metric" ? Number(kg) : Number(lb) * 0.45359237;

  const value = bmi(weightKg, heightCm);
  const valid = Number.isFinite(value);
  const category = valid ? bmiCategory(value, standard) : null;
  const healthy = valid ? healthyWeightRange(heightCm, standard) : null;

  const switchSystem = (next: "metric" | "imperial") => {
    if (next === system) return;
    if (next === "imperial") {
      const totalInches = heightCm / 2.54;
      setFt(String(Math.floor(totalInches / 12)));
      setInch(totalInches % 12 ? (totalInches % 12).toFixed(1) : "0");
      setLb((weightKg / 0.45359237).toFixed(1));
    } else {
      setCm(heightCm.toFixed(1));
      setKg(weightKg.toFixed(1));
    }
    setSystem(next);
  };

  const fmt = (n: number) => (Number.isFinite(n) ? n.toFixed(1) : "—");
  // The Chinese standard has a single obesity band, not three
  const categoryLabel = (id: BmiCategoryId) =>
    standard === "cn" && id === "obese1" ? t.obese : t.categories[id];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <Segmented
          ariaLabel={t.units}
          value={system}
          onChange={switchSystem}
          options={[
            { value: "metric", label: t.metric },
            { value: "imperial", label: t.imperial },
          ]}
        />
        <Segmented
          ariaLabel={t.standard}
          value={standard}
          onChange={setStandard}
          options={[
            { value: "who", label: t.who },
            { value: "cn", label: t.cn },
          ]}
        />
      </div>

      <div className="flex flex-wrap items-end gap-x-6 gap-y-3 rounded-lg border border-border bg-surface p-3">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-foreground-subtle">{t.height}</span>
          {system === "metric" ? (
            <span className="flex items-center gap-1.5">
              <Input
                value={cm}
                onChange={(e) => setCm(e.target.value)}
                inputMode="decimal"
                className="w-24 font-mono text-sm"
              />
              <span className="text-xs text-foreground-subtle">{t.cm}</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Input
                value={ft}
                onChange={(e) => setFt(e.target.value)}
                inputMode="numeric"
                aria-label={t.ft}
                className="w-16 font-mono text-sm"
              />
              <span className="text-xs text-foreground-subtle">{t.ft}</span>
              <Input
                value={inch}
                onChange={(e) => setInch(e.target.value)}
                inputMode="decimal"
                aria-label={t.in}
                className="w-16 font-mono text-sm"
              />
              <span className="text-xs text-foreground-subtle">{t.in}</span>
            </span>
          )}
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-foreground-subtle">{t.weight}</span>
          <span className="flex items-center gap-1.5">
            <Input
              value={system === "metric" ? kg : lb}
              onChange={(e) => (system === "metric" ? setKg(e.target.value) : setLb(e.target.value))}
              inputMode="decimal"
              className="w-24 font-mono text-sm"
            />
            <span className="text-xs text-foreground-subtle">
              {system === "metric" ? t.kg : t.lb}
            </span>
          </span>
        </label>
      </div>

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex h-10 items-center gap-2 border-b border-border px-3">
          <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
            {t.result}
          </span>
          {valid && (
            <div className="ml-auto">
              <CopyButton value={fmt(value)} size="icon-xs" />
            </div>
          )}
        </header>
        <div className="flex flex-wrap items-center gap-3 px-4 py-4">
          <span className="font-mono text-3xl font-medium text-foreground">
            {valid ? fmt(value) : "—"}
          </span>
          {category && (
            <Badge variant={VARIANT[category]} size="sm" dot>
              {categoryLabel(category)}
            </Badge>
          )}
          {healthy && (
            <span className="text-xs text-foreground-muted">
              {t.healthy}: {t.range(fmt(healthy.min), fmt(healthy.max))}
              {system === "imperial" &&
                ` (${fmt(healthy.min / 0.45359237)} – ${fmt(healthy.max / 0.45359237)} ${t.lb})`}
            </span>
          )}
          {!valid && <span className="text-xs text-foreground-subtle">{t.invalid}</span>}
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex h-10 items-center border-b border-border px-3">
          <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
            {t.bands}
          </span>
        </header>
        <ul className="divide-y divide-border">
          {SHOWN[standard].map((id) => {
            const band = BMI_BANDS[standard].find((item) => item.id === id)!;
            const previous = BMI_BANDS[standard][BMI_BANDS[standard].indexOf(band) - 1];
            const lower = previous ? previous.max : 0;
            const active = id === category;
            return (
              <li
                key={id}
                className={cn(
                  "flex items-center gap-3 px-4 py-2 text-xs",
                  active && "bg-hover-bg"
                )}
              >
                <span className={cn("flex-1", active ? "text-foreground" : "text-foreground-muted")}>
                  {categoryLabel(id)}
                </span>
                <span className="font-mono text-[11px] text-foreground-subtle">
                  {Number.isFinite(band.max)
                    ? `${lower} – ${band.max}`
                    : `${lower} +`}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="text-[11px] leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}

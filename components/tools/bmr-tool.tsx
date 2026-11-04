"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CopyButton, ErrorNote, Pane, Segmented } from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { errorText, safe } from "@/lib/errors";
import {
  ACTIVITY_FACTORS,
  bmr,
  bmrComparison,
  tdee,
  type ActivityId,
  type FormulaId,
  type Sex,
} from "@/lib/health";

const COPY = {
  zh: {
    sex: "性别",
    male: "男",
    female: "女",
    age: "年龄",
    years: "岁",
    height: "身高",
    cm: "厘米",
    weight: "体重",
    kg: "千克",
    bodyFat: "体脂率",
    optional: "可选",
    activity: "活动强度",
    formula: "计算公式",
    result: "每日消耗",
    bmr: "基础代谢 BMR",
    tdeeLabel: "总消耗 TDEE",
    kcalDay: "kcal/天",
    compare: "三种公式的 BMR",
    activityTable: "不同活动强度下的 TDEE",
    current: "当前",
    empty: "填入年龄、身高和体重后这里给出结果",
    note: "BMR 是躺着不动也要消耗的热量，TDEE 是加上日常活动后的总量。公式都是人群估算，个体误差可达 ±10%；体脂率填了才用 Katch-McArdle（按去脂体重算，对肌肉量高的人更准）。不构成医疗或营养建议。",
    activities: {
      sedentary: "久坐，几乎不运动",
      light: "轻度，每周 1–3 次",
      moderate: "中等，每周 3–5 次",
      active: "高强度，每周 6–7 次",
      veryActive: "极高，体力工作或两练",
    } as Record<ActivityId, string>,
    formulas: {
      mifflin: "Mifflin-St Jeor",
      harris: "Harris-Benedict",
      katch: "Katch-McArdle",
    } as Record<FormulaId, string>,
  },
  en: {
    sex: "Sex",
    male: "Male",
    female: "Female",
    age: "Age",
    years: "yr",
    height: "Height",
    cm: "cm",
    weight: "Weight",
    kg: "kg",
    bodyFat: "Body fat",
    optional: "Optional",
    activity: "Activity",
    formula: "Formula",
    result: "Daily energy",
    bmr: "Basal rate (BMR)",
    tdeeLabel: "Total (TDEE)",
    kcalDay: "kcal/day",
    compare: "BMR by formula",
    activityTable: "TDEE at each activity level",
    current: "Current",
    empty: "Enter age, height and weight to see the numbers",
    note: "BMR is what you burn at rest; TDEE adds daily activity. Both are population estimates with roughly ±10% individual error. Katch-McArdle only runs with a body fat figure — it works from lean mass, so it suits muscular builds better. Not medical or dietary advice.",
    activities: {
      sedentary: "Sedentary, little exercise",
      light: "Light, 1–3 days a week",
      moderate: "Moderate, 3–5 days a week",
      active: "Active, 6–7 days a week",
      veryActive: "Very active, physical job or two sessions a day",
    } as Record<ActivityId, string>,
    formulas: {
      mifflin: "Mifflin-St Jeor",
      harris: "Harris-Benedict",
      katch: "Katch-McArdle",
    } as Record<FormulaId, string>,
  },
};

const ACTIVITY_IDS: ActivityId[] = ["sedentary", "light", "moderate", "active", "veryActive"];
const FORMULA_IDS: FormulaId[] = ["mifflin", "harris", "katch"];

export function BmrTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [sex, setSex] = React.useState<Sex>("male");
  const [age, setAge] = React.useState("30");
  const [height, setHeight] = React.useState("175");
  const [weight, setWeight] = React.useState("70");
  const [bodyFat, setBodyFat] = React.useState("");
  const [activity, setActivity] = React.useState<ActivityId>("moderate");
  const [formula, setFormula] = React.useState<FormulaId>("mifflin");

  const input = React.useMemo(
    () => ({
      sex,
      age: Number(age),
      heightCm: Number(height),
      weightKg: Number(weight),
      bodyFat: bodyFat.trim() === "" ? null : Number(bodyFat),
    }),
    [sex, age, height, weight, bodyFat]
  );

  const solved = React.useMemo(() => safe(() => bmr(input, formula)), [input, formula]);
  const basal = solved.value;
  const daily = basal === null ? null : safe(() => tdee(basal, activity)).value;
  const comparison = React.useMemo(
    () => (solved.error ? null : bmrComparison(input)),
    [input, solved.error]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          <div className="flex flex-wrap items-center gap-4">
            <Segmented
              ariaLabel={t.sex}
              value={sex}
              onChange={setSex}
              options={[
                { value: "male", label: t.male },
                { value: "female", label: t.female },
              ]}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-foreground-subtle">{t.age}</span>
              <span className="flex items-center gap-1.5">
                <Input
                  value={age}
                  onChange={(event) => setAge(event.target.value)}
                  inputMode="numeric"
                  className="w-full font-mono text-sm"
                  size="xs"
                />
                <span className="shrink-0 font-mono text-[11px] text-foreground-faint">{t.years}</span>
              </span>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-foreground-subtle">{t.height}</span>
              <span className="flex items-center gap-1.5">
                <Input
                  value={height}
                  onChange={(event) => setHeight(event.target.value)}
                  inputMode="decimal"
                  className="w-full font-mono text-sm"
                  size="xs"
                />
                <span className="shrink-0 font-mono text-[11px] text-foreground-faint">{t.cm}</span>
              </span>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-foreground-subtle">{t.weight}</span>
              <span className="flex items-center gap-1.5">
                <Input
                  value={weight}
                  onChange={(event) => setWeight(event.target.value)}
                  inputMode="decimal"
                  className="w-full font-mono text-sm"
                  size="xs"
                />
                <span className="shrink-0 font-mono text-[11px] text-foreground-faint">{t.kg}</span>
              </span>
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-foreground-subtle">
              {t.bodyFat} <span className="text-foreground-faint">· {t.optional}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Input
                value={bodyFat}
                onChange={(event) => setBodyFat(event.target.value)}
                inputMode="decimal"
                placeholder="20"
                className="w-24 font-mono text-sm"
                size="xs"
              />
              <span className="font-mono text-[11px] text-foreground-faint">%</span>
            </span>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-foreground-subtle">{t.activity}</span>
              <Select value={activity} onValueChange={(value) => setActivity(value as ActivityId)}>
                <SelectTrigger size="xs" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_IDS.map((id) => (
                    <SelectItem key={id} value={id}>
                      {t.activities[id]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-foreground-subtle">{t.formula}</span>
              <Select value={formula} onValueChange={(value) => setFormula(value as FormulaId)}>
                <SelectTrigger size="xs" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMULA_IDS.map((id) => (
                    <SelectItem key={id} value={id}>
                      {t.formulas[id]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>

          {solved.error && <ErrorNote>{errorText(solved.error, locale)}</ErrorNote>}
        </div>

        <div className="min-w-0 self-start overflow-hidden rounded-lg border border-border bg-surface">
          <Pane
            label={t.result}
            footer={<span>{daily === null ? "—" : `${daily} ${t.kcalDay}`}</span>}
          >
            {basal === null || daily === null ? (
              <p className="px-3 py-6 text-[13px] text-foreground-faint">{t.empty}</p>
            ) : (
              <div className="flex flex-col">
                <div className="flex items-start gap-2 border-b border-border px-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] text-foreground-subtle">{t.tdeeLabel}</div>
                    <div className="font-mono text-2xl leading-tight text-foreground">
                      {daily} <span className="text-[13px] text-foreground-faint">{t.kcalDay}</span>
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-foreground-faint">
                      {t.bmr} {basal} {t.kcalDay}
                    </div>
                  </div>
                  <CopyButton value={String(daily)} size="icon-xs" />
                </div>

                <dl className="divide-y divide-border border-b border-border text-[12px]">
                  {FORMULA_IDS.map((id) => {
                    const value = comparison?.[id] ?? null;
                    return (
                      <div
                        key={id}
                        className="flex items-center gap-3 px-3 py-1.5"
                      >
                        <dt className={id === formula ? "text-foreground" : "text-foreground-subtle"}>
                          {t.formulas[id]}
                        </dt>
                        <dd className="ml-auto font-mono text-foreground">
                          {value === null ? "—" : value}
                        </dd>
                      </div>
                    );
                  })}
                </dl>

                <div className="px-3 py-2 text-[11px] text-foreground-subtle">{t.activityTable}</div>
                <dl className="divide-y divide-border border-t border-border text-[12px]">
                  {ACTIVITY_IDS.map((id) => (
                    <div
                      key={id}
                      className={
                        id === activity
                          ? "flex items-center gap-3 bg-hover-bg px-3 py-1.5"
                          : "flex items-center gap-3 px-3 py-1.5"
                      }
                    >
                      <dt className="min-w-0 truncate text-foreground-subtle">{t.activities[id]}</dt>
                      <dd className="ml-auto shrink-0 font-mono text-foreground">
                        {Math.round(basal * ACTIVITY_FACTORS[id])}
                      </dd>
                    </div>
                  ))}
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

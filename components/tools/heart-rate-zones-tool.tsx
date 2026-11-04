"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErrorNote, Pane, Segmented } from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { errorText, safe } from "@/lib/errors";
import {
  heartZones,
  maxHeartRate,
  maxHeartRateComparison,
  type HeartZone,
  type HrFormula,
  type ZoneId,
  type ZoneMethod,
} from "@/lib/heart-rate";

const COPY = {
  zh: {
    age: "年龄",
    years: "岁",
    formula: "最大心率公式",
    method: "区间算法",
    byMax: "最大心率百分比",
    byReserve: "储备心率（Karvonen）",
    resting: "静息心率",
    restingHint: "早上刚醒时测，连续几天取平均",
    bpm: "bpm",
    result: "心率区间",
    maxHr: "最大心率",
    compare: "公式对比",
    empty: "填入年龄后这里列出五个心率区间",
    zoneName: {
      z1: "Z1 恢复",
      z2: "Z2 有氧",
      z3: "Z3 节奏",
      z4: "Z4 阈值",
      z5: "Z5 最大",
    } as Record<ZoneId, string>,
    zoneUse: {
      z1: "热身、冷身、排酸",
      z2: "打有氧基础，能正常说话的强度",
      z3: "节奏跑，呼吸变深但仍可控",
      z4: "乳酸阈值，只能蹦短句",
      z5: "冲刺与间歇，坚持不了几分钟",
    } as Record<ZoneId, string>,
    zoneTwoTitle: "Z2 是你该待得最久的地方",
    zoneTwoText:
      "轻松跑、长距离和大部分训练量都放在 Z2。它练的是脂肪供能和毛细血管密度，强度低到能一边跑一边聊天。",
    note: "220 − 年龄只是粗略估计，个体标准差约 10–12 bpm；Tanaka（208 − 0.7 × 年龄）在成年人里更稳，Gulati 来自女性样本。有条件的话用实测最大心率替代估算。有心血管疾病或正在服药的人，先问医生再按区间训练。",
  },
  en: {
    age: "Age",
    years: "yr",
    formula: "Max HR formula",
    method: "Zone method",
    byMax: "Percent of max",
    byReserve: "Heart-rate reserve (Karvonen)",
    resting: "Resting HR",
    restingHint: "Measure right after waking, average a few days",
    bpm: "bpm",
    result: "Heart rate zones",
    maxHr: "Max heart rate",
    compare: "Formula comparison",
    empty: "Enter an age to see the five zones",
    zoneName: {
      z1: "Z1 Recovery",
      z2: "Z2 Aerobic",
      z3: "Z3 Tempo",
      z4: "Z4 Threshold",
      z5: "Z5 Max",
    } as Record<ZoneId, string>,
    zoneUse: {
      z1: "Warm-up, cool-down, flushing",
      z2: "Builds the aerobic base, conversational effort",
      z3: "Tempo running, deeper breathing but still controlled",
      z4: "Lactate threshold, short sentences only",
      z5: "Sprints and intervals, minutes at most",
    } as Record<ZoneId, string>,
    zoneTwoTitle: "Zone 2 is where most of your time belongs",
    zoneTwoText:
      "Easy runs, long runs and most of the weekly volume sit in Z2. It trains fat oxidation and capillary density at an effort easy enough to hold a conversation.",
    note: "220 minus age is a rough estimate with a standard deviation of 10–12 bpm; Tanaka (208 − 0.7 × age) holds up better in adults, and Gulati comes from a female cohort. If you can, test your real maximum instead of estimating. With heart disease or on medication that affects heart rate, ask a doctor before training by zones.",
  },
};

const ZONE_COLORS: Record<ZoneId, string> = {
  z1: "#3b82f6",
  z2: "#22c55e",
  z3: "#eab308",
  z4: "#f97316",
  z5: "#ef4444",
};

const FORMULAS: HrFormula[] = ["classic", "tanaka", "gulati"];

const FORMULA_NAMES: Record<HrFormula, string> = {
  classic: "220 − age",
  tanaka: "Tanaka",
  gulati: "Gulati",
};

export function HeartRateZonesTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [age, setAge] = React.useState("30");
  const [formula, setFormula] = React.useState<HrFormula>("tanaka");
  const [method, setMethod] = React.useState<ZoneMethod>("max");
  const [resting, setResting] = React.useState("60");

  const maxHr = React.useMemo(() => safe(() => maxHeartRate(Number(age), formula)), [age, formula]);
  const zones = React.useMemo<{ value: HeartZone[] | null; error: Error | null }>(() => {
    const peak = maxHr.value;
    if (maxHr.error || peak === null) return { value: null, error: maxHr.error };
    return safe(() => heartZones(peak, method === "reserve" ? Number(resting) : null, method));
  }, [maxHr, method, resting]);

  const list = zones.value;
  const error = maxHr.error ?? zones.error;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          <div className="grid gap-3 sm:grid-cols-2">
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
              <span className="text-[11px] font-medium text-foreground-subtle">{t.formula}</span>
              <Select value={formula} onValueChange={(value) => setFormula(value as HrFormula)}>
                <SelectTrigger size="xs" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMULAS.map((id) => (
                    <SelectItem key={id} value={id}>
                      {FORMULA_NAMES[id]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>

          <Segmented
            ariaLabel={t.method}
            value={method}
            onChange={setMethod}
            options={[
              { value: "max", label: t.byMax },
              { value: "reserve", label: t.byReserve },
            ]}
          />

          {method === "reserve" && (
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-foreground-subtle">{t.resting}</span>
              <span className="flex items-center gap-1.5">
                <Input
                  value={resting}
                  onChange={(event) => setResting(event.target.value)}
                  inputMode="numeric"
                  className="w-24 font-mono text-sm"
                  size="xs"
                />
                <span className="font-mono text-[11px] text-foreground-faint">
                  {t.bpm} · {t.restingHint}
                </span>
              </span>
            </label>
          )}

          {error && <ErrorNote>{errorText(error, locale)}</ErrorNote>}

          <p className="mt-1 rounded-md border border-border bg-hover-bg px-3 py-2 text-[11.5px] leading-relaxed text-foreground-subtle">
            <span className="font-medium text-foreground">{t.zoneTwoTitle}</span>
            <br />
            {t.zoneTwoText}
          </p>
        </div>

        <div className="min-w-0 self-start overflow-hidden rounded-lg border border-border bg-surface">
          <Pane
            label={t.result}
            footer={<span>{maxHr.value === null ? "—" : `${t.maxHr} ${maxHr.value} ${t.bpm}`}</span>}
          >
            {!list ? (
              <p className="px-3 py-6 text-[13px] text-foreground-faint">{t.empty}</p>
            ) : (
              <div className="flex flex-col">
                {list.map((zone) => (
                  <div
                    key={zone.id}
                    className="flex items-center gap-3 border-b border-border px-3 py-2 last:border-b-0"
                  >
                    <span
                      className="h-8 w-1 shrink-0 rounded-full"
                      style={{ backgroundColor: ZONE_COLORS[zone.id] }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[13px] text-foreground">{t.zoneName[zone.id]}</span>
                        <span className="font-mono text-[11px] text-foreground-faint">
                          {Math.round(zone.lowPct * 100)}–{Math.round(zone.highPct * 100)}%
                        </span>
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-foreground-subtle">
                        {t.zoneUse[zone.id]}
                      </div>
                    </div>
                    <div className="shrink-0 text-right font-mono text-[13px] text-foreground">
                      {zone.low}
                      <span className="text-foreground-faint">–</span>
                      {zone.high}
                    </div>
                  </div>
                ))}

                {maxHr.value !== null && (
                  <div className="border-t border-border px-3 py-2">
                    <div className="mb-1 text-[11px] text-foreground-subtle">{t.compare}</div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-foreground-muted">
                      {Object.entries(maxHeartRateComparison(Number(age))).map(([id, value]) => (
                        <span key={id}>
                          {FORMULA_NAMES[id as HrFormula]} <span className="text-foreground">{value}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Pane>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}

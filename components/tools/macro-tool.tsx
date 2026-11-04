"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { CopyButton, ErrorNote, Pane, Segmented, WarningNote } from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { errorText, safe } from "@/lib/errors";
import { macroPlan, type GoalId, type MacroPlan } from "@/lib/health";

const COPY = {
  zh: {
    weight: "体重",
    kg: "千克",
    calories: "每日热量",
    kcal: "kcal",
    goal: "目标",
    cut: "减脂",
    maintain: "维持",
    bulk: "增肌",
    protein: "蛋白质",
    proteinUnit: "克/公斤体重",
    carbs: "碳水",
    fat: "脂肪占比",
    result: "营养素分配",
    empty: "填入体重与热量目标后这里给出克数",
    total: "每日热量",
    clamped: "蛋白质加脂肪已经吃满热量预算，碳水被压到 0。调低蛋白质或脂肪占比再看。",
    hint: "蛋白质按体重给量（减脂 2.0、维持 1.6、增肌 1.8 g/kg 是常见起点），脂肪占 25%，剩下的热量给碳水。减脂期蛋白质给足能保住肌肉，脂肪别低于 0.6 g/kg。",
    note: "热量与蛋白摄入只是起点，实际要按 2–4 周的体重变化调整。有肾脏疾病、孕期或进食障碍史的人请先问医生或注册营养师，这里不构成营养建议。",
    grams: "克",
    kcalShort: "kcal",
  },
  en: {
    weight: "Weight",
    kg: "kg",
    calories: "Daily calories",
    kcal: "kcal",
    goal: "Goal",
    cut: "Cut",
    maintain: "Maintain",
    bulk: "Bulk",
    protein: "Protein",
    proteinUnit: "g per kg",
    carbs: "Carbs",
    fat: "Fat share",
    result: "Macro split",
    empty: "Enter a weight and a calorie target to see the grams",
    total: "Daily calories",
    clamped: "Protein and fat already fill the calorie budget, so carbs were pinned at zero. Lower the protein or fat share.",
    hint: "Protein scales with body weight (2.0 g/kg cutting, 1.6 maintaining, 1.8 bulking are common starting points), fat takes 25%, and carbohydrates get what is left. Enough protein protects muscle while cutting; keep fat above 0.6 g/kg.",
    note: "Calories and protein are a starting point — adjust against what the scale does over two to four weeks. With kidney disease, pregnancy or a history of disordered eating, talk to a doctor or registered dietitian first. This is not dietary advice.",
    grams: "g",
    kcalShort: "kcal",
  },
};

const GOALS: { value: GoalId; key: "cut" | "maintain" | "bulk" }[] = [
  { value: "cut", key: "cut" },
  { value: "maintain", key: "maintain" },
  { value: "bulk", key: "bulk" },
];

export function MacroTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [weight, setWeight] = React.useState("70");
  const [calories, setCalories] = React.useState("2200");
  const [goal, setGoal] = React.useState<GoalId>("maintain");
  const [proteinPerKg, setProteinPerKg] = React.useState("1.6");
  const [fatShare, setFatShare] = React.useState("25");

  // Switching the goal moves the protein default, unless the user typed their own
  const pickGoal = (next: GoalId) => {
    setGoal(next);
    setProteinPerKg(next === "cut" ? "2.0" : next === "bulk" ? "1.8" : "1.6");
  };

  const solved = React.useMemo(
    () =>
      safe(() =>
        macroPlan({
          weightKg: Number(weight),
          calories: Number(calories),
          goal,
          proteinPerKg: Number(proteinPerKg),
          fatShare: Number(fatShare) / 100,
        })
      ),
    [weight, calories, goal, proteinPerKg, fatShare]
  );

  const plan: MacroPlan | null = solved.value;

  const rows = plan
    ? [
        { key: "protein", label: t.protein, grams: plan.proteinG, kcal: plan.proteinKcal, pct: plan.proteinPct, color: "bg-accent" },
        { key: "fat", label: t.fat, grams: plan.fatG, kcal: plan.fatKcal, pct: plan.fatPct, color: "bg-accent/60" },
        { key: "carb", label: t.carbs, grams: plan.carbG, kcal: plan.carbKcal, pct: plan.carbPct, color: "bg-accent/30" },
      ]
    : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          <Segmented
            ariaLabel={t.goal}
            value={goal}
            onChange={pickGoal}
            options={GOALS.map((item) => ({ value: item.value, label: t[item.key] }))}
          />

          <div className="grid gap-3 sm:grid-cols-2">
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
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-foreground-subtle">{t.calories}</span>
              <span className="flex items-center gap-1.5">
                <Input
                  value={calories}
                  onChange={(event) => setCalories(event.target.value)}
                  inputMode="numeric"
                  className="w-full font-mono text-sm"
                  size="xs"
                />
                <span className="shrink-0 font-mono text-[11px] text-foreground-faint">{t.kcal}</span>
              </span>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-foreground-subtle">{t.protein}</span>
              <span className="flex items-center gap-1.5">
                <Input
                  value={proteinPerKg}
                  onChange={(event) => setProteinPerKg(event.target.value)}
                  inputMode="decimal"
                  className="w-full font-mono text-sm"
                  size="xs"
                />
                <span className="shrink-0 font-mono text-[11px] text-foreground-faint">
                  {t.proteinUnit}
                </span>
              </span>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-foreground-subtle">{t.fat}</span>
              <span className="flex items-center gap-1.5">
                <Input
                  value={fatShare}
                  onChange={(event) => setFatShare(event.target.value)}
                  inputMode="numeric"
                  className="w-full font-mono text-sm"
                  size="xs"
                />
                <span className="shrink-0 font-mono text-[11px] text-foreground-faint">%</span>
              </span>
            </label>
          </div>

          {solved.error && <ErrorNote>{errorText(solved.error, locale)}</ErrorNote>}
          {plan?.carbClamped && <WarningNote>{t.clamped}</WarningNote>}
        </div>

        <div className="min-w-0 self-start overflow-hidden rounded-lg border border-border bg-surface">
          <Pane
            label={t.result}
            footer={<span>{plan ? `${plan.calories} ${t.kcal}` : "—"}</span>}
          >
            {!plan ? (
              <p className="px-3 py-6 text-[13px] text-foreground-faint">{t.empty}</p>
            ) : (
              <div className="flex flex-col">
                <div className="flex items-baseline gap-2 border-b border-border px-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] text-foreground-subtle">{t.total}</div>
                    <div className="font-mono text-2xl leading-tight text-foreground">
                      {plan.calories}{" "}
                      <span className="text-[13px] text-foreground-faint">{t.kcal}</span>
                    </div>
                  </div>
                  <CopyButton value={String(plan.calories)} size="icon-xs" />
                </div>

                <div className="flex h-2 gap-px overflow-hidden border-b border-border">
                  {rows.map((row) => (
                    <span
                      key={row.key}
                      className={row.color}
                      style={{ width: `${Math.max(0, row.pct)}%` }}
                    />
                  ))}
                </div>

                <dl className="divide-y divide-border text-[12px]">
                  {rows.map((row) => (
                    <div key={row.key} className="flex items-center gap-3 px-3 py-2">
                      <span className={`h-2 w-2 shrink-0 rounded-sm ${row.color}`} />
                      <dt className="min-w-0 truncate text-foreground-subtle">{row.label}</dt>
                      <dd className="ml-auto shrink-0 text-right font-mono text-foreground">
                        {row.grams} {t.grams}
                        <span className="ml-2 text-[11px] text-foreground-faint">
                          {row.kcal} {t.kcalShort} · {row.pct}%
                        </span>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </Pane>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.hint}</p>
      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}

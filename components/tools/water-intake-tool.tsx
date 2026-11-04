"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { CopyButton, ErrorNote, Pane, Toggle } from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { errorText, safe } from "@/lib/errors";
import { waterTarget, type WaterTarget } from "@/lib/health";

const COPY = {
  zh: {
    weight: "体重",
    kg: "千克",
    exercise: "运动时长",
    minutes: "分钟",
    hot: "天气炎热",
    result: "每日饮水",
    empty: "填入体重后这里给出建议饮水量",
    litre: "升",
    ml: "毫升",
    glasses: (n: number) => `约 ${n} 杯（250 ml）`,
    base: "基础需要",
    exercisePart: "运动补充",
    schedule: "分配建议",
    range: "合理区间",
    scheduleText:
      "起床后先喝 300–500 ml，其余分摊到两餐之间；运动前后各补 200–300 ml，别等到口渴才喝。",
    note: "按每公斤体重 35 ml 估算，运动每分钟再加 12 ml（约合每小时 0.7 L 汗液），炎热天气整体上浮 10%。出汗量大、尿液颜色深的人要再加。心衰、肾功能不全或需要限水的人请遵医嘱，这里的数字不适用。",
  },
  en: {
    weight: "Weight",
    kg: "kg",
    exercise: "Exercise",
    minutes: "min",
    hot: "Hot weather",
    result: "Daily water",
    empty: "Enter a weight to see the target",
    litre: "L",
    ml: "ml",
    glasses: (n: number) => `about ${n} glasses of 250 ml`,
    base: "Baseline",
    exercisePart: "Exercise",
    schedule: "How to spread it",
    range: "Sensible range",
    scheduleText:
      "Start with 300–500 ml after waking, spread the rest between meals, and add 200–300 ml before and after training — do not wait until you are thirsty.",
    note: "Roughly 35 ml per kilogram of body weight, plus 12 ml per minute of exercise (about 0.7 L of sweat per hour), with another 10% in hot weather. Heavy sweaters and dark urine need more. If you have heart failure, kidney disease or a fluid restriction, follow your doctor instead — these numbers do not apply.",
  },
};

export function WaterIntakeTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [weight, setWeight] = React.useState("70");
  const [minutes, setMinutes] = React.useState("30");
  const [hot, setHot] = React.useState(false);

  const solved = React.useMemo(
    () => safe(() => waterTarget(Number(weight), Number(minutes), hot)),
    [weight, minutes, hot]
  );

  const target: WaterTarget | null = solved.value;
  const litres = target ? target.ml / 1000 : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
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
              <span className="text-[11px] font-medium text-foreground-subtle">{t.exercise}</span>
              <span className="flex items-center gap-1.5">
                <Input
                  value={minutes}
                  onChange={(event) => setMinutes(event.target.value)}
                  inputMode="numeric"
                  className="w-full font-mono text-sm"
                  size="xs"
                />
                <span className="shrink-0 font-mono text-[11px] text-foreground-faint">
                  {t.minutes}
                </span>
              </span>
            </label>
          </div>

          <Toggle checked={hot} onChange={setHot} label={t.hot} />

          {solved.error && <ErrorNote>{errorText(solved.error, locale)}</ErrorNote>}
        </div>

        <div className="min-w-0 self-start overflow-hidden rounded-lg border border-border bg-surface">
          <Pane
            label={t.result}
            footer={<span>{target ? `${litres!.toFixed(2)} ${t.litre}` : "—"}</span>}
          >
            {!target ? (
              <p className="px-3 py-6 text-[13px] text-foreground-faint">{t.empty}</p>
            ) : (
              <div className="flex flex-col">
                <div className="flex items-start gap-2 border-b border-border px-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-2xl leading-tight text-foreground">
                      {litres!.toFixed(2)} {t.litre}
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-foreground-faint">
                      {target.ml} {t.ml} · {t.glasses(target.glasses)}
                    </div>
                  </div>
                  <CopyButton value={String(target.ml)} size="icon-xs" />
                </div>

                <dl className="divide-y divide-border border-b border-border text-[12px]">
                  <div className="flex items-center gap-3 px-3 py-2">
                    <dt className="text-foreground-subtle">{t.base}</dt>
                    <dd className="ml-auto font-mono text-foreground">
                      {target.baseMl} {t.ml}
                    </dd>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2">
                    <dt className="text-foreground-subtle">{t.exercisePart}</dt>
                    <dd className="ml-auto font-mono text-foreground">
                      {target.exerciseMl} {t.ml}
                    </dd>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2">
                    <dt className="text-foreground-subtle">{t.range}</dt>
                    <dd className="ml-auto font-mono text-[11px] text-foreground-faint">
                      {target.min}–{target.max} {t.ml}
                    </dd>
                  </div>
                </dl>

                <p className="px-3 py-2.5 text-[11.5px] leading-relaxed text-foreground-subtle">
                  {t.scheduleText}
                </p>
              </div>
            )}
          </Pane>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}

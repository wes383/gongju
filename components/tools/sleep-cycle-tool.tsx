"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { CopyButton, ErrorNote, Pane, Segmented } from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { errorText, safe } from "@/lib/errors";
import { bedTimes, formatClock, splitHours, wakeTimes, type SleepSlot } from "@/lib/sleep";

const COPY = {
  zh: {
    direction: "计算方向",
    fromBed: "按入睡时间算起床",
    fromWake: "按起床时间算入睡",
    bed: "入睡时间",
    wake: "起床时间",
    latency: "入睡所需",
    minutes: "分钟",
    result: "推荐时间",
    empty: "选择一个时间后这里列出几个节点",
    cycles: (n: number) => `${n} 个周期`,
    recommended: "推荐",
    duration: (hours: number, minutes: number) => `${hours} 小时 ${minutes} 分`,
    note: "一个睡眠周期约 90 分钟，在周期结束时醒来通常更清醒，所以闹钟要落在整周期之后，而不是半夜。入睡所需时间按 15 分钟算（普通人平均 10–20 分钟），可以按自己情况调整。周期长度因人而异（70–120 分钟），长期睡不够或白天困倦请优先保证总时长，而不是卡周期。",
  },
  en: {
    direction: "Direction",
    fromBed: "Bedtime → wake up",
    fromWake: "Wake time → go to bed",
    bed: "Bedtime",
    wake: "Wake time",
    latency: "Time to fall asleep",
    minutes: "min",
    result: "Suggested times",
    empty: "Pick a time to see the options",
    cycles: (n: number) => `${n} cycles`,
    recommended: "Recommended",
    duration: (hours: number, minutes: number) => `${hours} h ${minutes} min`,
    note: "A sleep cycle runs about 90 minutes, and waking at the end of one usually feels easier, so the alarm goes after a whole number of cycles rather than mid-cycle. Falling asleep is assumed to take 15 minutes (most people take 10–20) and can be adjusted. Cycle length varies from person to person (70–120 minutes); if you are chronically short on sleep or drowsy by day, protect total duration before fine-tuning cycles.",
  },
};

type Direction = "bed" | "wake";

export function SleepCycleTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [direction, setDirection] = React.useState<Direction>("bed");
  const [bed, setBed] = React.useState("23:30");
  const [wake, setWake] = React.useState("07:00");
  const [latency, setLatency] = React.useState("15");

  const solved = React.useMemo<{ value: SleepSlot[] | null; error: Error | null }>(() => {
    const wait = Number(latency);
    if (direction === "bed") return safe(() => wakeTimes(bed, wait));
    return safe(() => bedTimes(wake, wait));
  }, [direction, bed, wake, latency]);

  const slots = solved.value;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          <Segmented
            ariaLabel={t.direction}
            value={direction}
            onChange={setDirection}
            options={[
              { value: "bed", label: t.fromBed },
              { value: "wake", label: t.fromWake },
            ]}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            {direction === "bed" ? (
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-foreground-subtle">{t.bed}</span>
                <Input
                  type="time"
                  value={bed}
                  onChange={(event) => setBed(event.target.value)}
                  className="w-32 font-mono text-sm"
                  size="xs"
                />
              </label>
            ) : (
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-foreground-subtle">{t.wake}</span>
                <Input
                  type="time"
                  value={wake}
                  onChange={(event) => setWake(event.target.value)}
                  className="w-32 font-mono text-sm"
                  size="xs"
                />
              </label>
            )}
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-foreground-subtle">{t.latency}</span>
              <span className="flex items-center gap-1.5">
                <Input
                  value={latency}
                  onChange={(event) => setLatency(event.target.value)}
                  inputMode="numeric"
                  className="w-24 font-mono text-sm"
                  size="xs"
                />
                <span className="font-mono text-[11px] text-foreground-faint">{t.minutes}</span>
              </span>
            </label>
          </div>

          {solved.error && <ErrorNote>{errorText(solved.error, locale)}</ErrorNote>}
        </div>

        <div className="min-w-0 self-start overflow-hidden rounded-lg border border-border bg-surface">
          <Pane
            label={t.result}
            footer={<span>{direction === "bed" ? t.fromBed : t.fromWake}</span>}
          >
            {!slots ? (
              <p className="px-3 py-6 text-[13px] text-foreground-faint">{t.empty}</p>
            ) : (
              <div className="flex flex-col">
                {slots.map((slot) => {
                  const time = formatClock(slot.clock);
                  const { hours, minutes } = splitHours(slot.totalMinutes);
                  const recommended = slot.cycles === 5 || slot.cycles === 6;
                  return (
                    <div
                      key={slot.cycles}
                      className={
                        recommended
                          ? "flex items-center gap-3 border-b border-border bg-hover-bg px-3 py-2.5 last:border-b-0"
                          : "flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0"
                      }
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono text-xl leading-tight text-foreground">{time}</span>
                          {recommended && (
                            <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium text-accent-fg">
                              {t.recommended}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-[11px] text-foreground-subtle">
                          {t.cycles(slot.cycles)} · {t.duration(hours, minutes)}
                        </div>
                      </div>
                      <CopyButton value={time} size="icon-xs" />
                    </div>
                  );
                })}
              </div>
            )}
          </Pane>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}

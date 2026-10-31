"use client";

import * as React from "react";
import { Cake } from "lucide-react";
import { useCopy, useLocale } from "@/components/locale-provider";
import { Input } from "@/components/ui/input";
import { WarningNote } from "@/components/tools/tool-ui";
import { ageBetween, type ZodiacSign } from "@/lib/age";

const COPY = {
  zh: {
    birth: "出生日期",
    at: "计算到",
    today: "今天",
    age: "周岁",
    years: (n: number) => `${n} 岁`,
    months: (n: number) => `${n} 个月`,
    days: (n: number) => `${n} 天`,
    totalMonths: "总月数",
    totalWeeks: "总周数",
    totalDays: "总天数",
    nextBirthday: "下次生日",
    inDays: (n: number) => `${n} 天后`,
    birthdayToday: "就是今天",
    turning: (n: number) => `满 ${n} 岁`,
    weekday: "出生那天",
    zodiac: "星座",
    monthsUnit: "个月",
    weeksUnit: "周",
    daysUnit: "天",
    pickBirth: "选择出生日期后开始计算",
    future: "出生日期不能晚于计算日期",
    note: "按日历日期计算，和医院、证件上的年龄口径一致；2 月 29 日出生的人在平年按 2 月 28 日过生日。",
    signs: {
      capricorn: "摩羯座",
      aquarius: "水瓶座",
      pisces: "双鱼座",
      aries: "白羊座",
      taurus: "金牛座",
      gemini: "双子座",
      cancer: "巨蟹座",
      leo: "狮子座",
      virgo: "处女座",
      libra: "天秤座",
      scorpio: "天蝎座",
      sagittarius: "射手座",
    } as Record<ZodiacSign, string>,
  },
  en: {
    birth: "Date of birth",
    at: "Age on",
    today: "Today",
    age: "Age",
    years: (n: number) => `${n} yr`,
    months: (n: number) => `${n} mo`,
    days: (n: number) => `${n} d`,
    totalMonths: "Months lived",
    totalWeeks: "Weeks lived",
    totalDays: "Days lived",
    nextBirthday: "Next birthday",
    inDays: (n: number) => `in ${n} day${n === 1 ? "" : "s"}`,
    birthdayToday: "Today",
    turning: (n: number) => `turning ${n}`,
    weekday: "Born on",
    zodiac: "Zodiac",
    monthsUnit: "months",
    weeksUnit: "weeks",
    daysUnit: "days",
    pickBirth: "Pick a date of birth to start",
    future: "The date of birth cannot be after the reference date",
    note: "Counted by calendar dates, the same way hospitals and ID documents do. Someone born on 29 February celebrates on 28 February in common years.",
    signs: {
      capricorn: "Capricorn",
      aquarius: "Aquarius",
      pisces: "Pisces",
      aries: "Aries",
      taurus: "Taurus",
      gemini: "Gemini",
      cancer: "Cancer",
      leo: "Leo",
      virgo: "Virgo",
      libra: "Libra",
      scorpio: "Scorpio",
      sagittarius: "Sagittarius",
    } as Record<ZodiacSign, string>,
  },
};

/** `YYYY-MM-DD` from a date input, read as a local date rather than UTC. */
function parseDateInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function toInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function AgeTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [birth, setBirth] = React.useState("");
  const [at, setAt] = React.useState("");

  // Defaults to today on the client so the rendered HTML never bakes in a date
  React.useEffect(() => {
    const id = window.setTimeout(() => setAt(toInputValue(new Date())), 0);
    return () => window.clearTimeout(id);
  }, []);

  const birthDate = parseDateInput(birth);
  const atDate = parseDateInput(at);
  const result = birthDate && atDate ? ageBetween(birthDate, atDate) : null;
  const future = birthDate !== null && atDate !== null && birthDate > atDate;

  const longDate = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const weekdayName = new Intl.DateTimeFormat(locale, { weekday: "long" });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-lg border border-border bg-surface px-4 py-3">
        <label className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground-muted">{t.birth}</span>
          <Input
            type="date"
            value={birth}
            max={at || undefined}
            onChange={(e) => setBirth(e.target.value)}
            aria-label={t.birth}
            size="xs"
            className="w-40 font-mono"
          />
        </label>
        <label className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground-muted">{t.at}</span>
          <Input
            type="date"
            value={at}
            onChange={(e) => setAt(e.target.value)}
            aria-label={t.at}
            size="xs"
            className="w-40 font-mono"
          />
        </label>
        <button
          type="button"
          onClick={() => setAt(toInputValue(new Date()))}
          className="text-xs text-foreground-subtle underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          {t.today}
        </button>
      </div>

      {future && <WarningNote>{t.future}</WarningNote>}

      {!birthDate ? (
        <p className="flex items-center gap-2 py-10 text-sm text-foreground-subtle">
          <Cake className="h-4 w-4" />
          {t.pickBirth}
        </p>
      ) : result ? (
        <>
          <div className="rounded-lg border border-border bg-surface p-5">
            <span className="text-xs font-medium text-foreground-muted">{t.age}</span>
            <p className="mt-1 font-display text-3xl font-semibold text-foreground">
              {t.years(result.years)}
              <span className="ml-2 text-lg text-foreground-muted">
                {t.months(result.months)}
              </span>
              <span className="ml-2 text-lg text-foreground-muted">{t.days(result.days)}</span>
            </p>
            {birthDate && (
              <p className="mt-2 font-mono text-[11px] text-foreground-faint">
                {longDate.format(birthDate)}
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Stat label={t.totalMonths} value={`${result.totalMonths} ${t.monthsUnit}`} />
            <Stat label={t.totalWeeks} value={`${result.totalWeeks} ${t.weeksUnit}`} />
            <Stat label={t.totalDays} value={`${result.totalDays} ${t.daysUnit}`} />
            <Stat
              label={t.nextBirthday}
              value={
                result.daysToNextBirthday === 0
                  ? `${t.birthdayToday} · ${t.turning(result.nextAge)}`
                  : `${t.inDays(result.daysToNextBirthday)} · ${t.turning(result.nextAge)}`
              }
            />
            <Stat
              label={t.weekday}
              value={birthDate ? weekdayName.format(birthDate) : "—"}
            />
            <Stat label={t.zodiac} value={t.signs[result.zodiac]} />
          </div>

          <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
        </>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3">
      <p className="text-[11px] text-foreground-subtle">{label}</p>
      <p className="mt-0.5 font-mono text-sm text-foreground">{value}</p>
    </div>
  );
}

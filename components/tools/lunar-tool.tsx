"use client";

import * as React from "react";
import { CalendarDays } from "lucide-react";
import {
  lunarDayOptions,
  lunarMonthOptions,
  lunarToSolar,
  solarToLunar,
  type LunarInfo,
} from "@/lib/lunar";
import { useCopy, useLocale } from "@/components/locale-provider";
import { OptionBar, Segmented } from "@/components/tools/tool-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const COPY = {
  zh: {
    solar2lunar: "公历 → 农历",
    lunar2solar: "农历 → 公历",
    solarDate: "公历日期",
    today: "今天",
    year: "年",
    month: "月",
    day: "日",
    lunarDate: "农历日期",
    solarResult: "公历",
    lunarResult: "农历",
    weekday: "星期",
    ganzhi: "干支",
    zodiac: "生肖",
    jieqi: "节气",
    invalid: "这个农历日期不存在，换一个月或日子试试",
    invalidSolar: "请选择有效的公历日期",
    empty: "选择一个日期后显示转换结果",
    note: "支持 1900–2100 年；闰月会在月份前标注「闰」。节日与节气只做展示，不作为万年历使用。",
  },
  en: {
    solar2lunar: "Gregorian → Lunar",
    lunar2solar: "Lunar → Gregorian",
    solarDate: "Gregorian date",
    today: "Today",
    year: "Year",
    month: "Month",
    day: "Day",
    lunarDate: "Lunar date",
    solarResult: "Gregorian",
    lunarResult: "Lunar",
    weekday: "Weekday",
    ganzhi: "Stem-branch",
    zodiac: "Zodiac",
    jieqi: "Solar term",
    invalid: "That lunar date does not exist — try another month or day",
    invalidSolar: "Pick a valid Gregorian date",
    empty: "Pick a date to see the conversion",
    note: "Covers 1900–2100. Leap months are marked “leap”. Stem-branch, solar terms and festivals come from the calendar library, which only ships Chinese names for them.",
  },
};

type Mode = "solar2lunar" | "lunar2solar";

/** The calendar library only returns Chinese zodiac names */
const ZODIAC_EN: Record<string, string> = {
  鼠: "Rat",
  牛: "Ox",
  虎: "Tiger",
  兔: "Rabbit",
  龙: "Dragon",
  蛇: "Snake",
  马: "Horse",
  羊: "Goat",
  猴: "Monkey",
  鸡: "Rooster",
  狗: "Dog",
  猪: "Pig",
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function LunarTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [mode, setMode] = React.useState<Mode>("solar2lunar");

  const [solarInput, setSolarInput] = React.useState("");
  const [year, setYear] = React.useState(2026);
  const [month, setMonth] = React.useState(9);
  const [day, setDay] = React.useState(21);

  // Seed both sides with today's date on the client only
  React.useEffect(() => {
    const id = window.setTimeout(() => {
      const now = new Date();
      setSolarInput(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
      const today = solarToLunar(now.getFullYear(), now.getMonth() + 1, now.getDate());
      if (today) {
        setYear(today.lunar.year);
        setMonth(today.lunar.month);
        setDay(today.lunar.day);
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const monthOptions = React.useMemo(
    () =>
      lunarMonthOptions(year, locale).map((option) => ({
        value: String(option.value),
        label: option.label,
      })),
    [year, locale]
  );

  const dayOptions = React.useMemo(
    () =>
      lunarDayOptions(locale).map((option) => ({
        value: String(option.value),
        label: option.label,
      })),
    [locale]
  );

  const result = React.useMemo<{ info: LunarInfo | null; error: string | null }>(() => {
    if (mode === "solar2lunar") {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(solarInput);
      if (!match) return { info: null, error: null };
      const info = solarToLunar(Number(match[1]), Number(match[2]), Number(match[3]));
      return { info, error: info ? null : t.invalidSolar };
    }

    const info = lunarToSolar(year, month, day);
    return { info, error: info ? null : t.invalid };
  }, [mode, solarInput, year, month, day, t]);

  const changeYear = (next: number) => {
    const clamped = Math.max(1900, Math.min(2100, next || 1900));
    setYear(clamped);
    const options = lunarMonthOptions(clamped);
    if (!options.some((option) => option.value === month)) setMonth(1);
  };

  const setToday = () => {
    const now = new Date();
    setSolarInput(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
    const today = solarToLunar(now.getFullYear(), now.getMonth() + 1, now.getDate());
    if (today) {
      setYear(today.lunar.year);
      setMonth(today.lunar.month);
      setDay(today.lunar.day);
    }
  };

  const info = result.info;
  const weekday = info
    ? new Date(info.solar.year, info.solar.month - 1, info.solar.day).toLocaleDateString(
        locale === "zh" ? "zh-CN" : "en-US",
        { weekday: "long" }
      )
    : "";
  // Lunar month/day names are Chinese by nature; spell them out for English
  const lunarText = info
    ? locale === "zh"
      ? `${info.yearChinese}年 ${info.lunar.monthName}月 ${info.lunar.dayName}`
      : `${info.lunar.year} · ${info.lunar.isLeapMonth ? "leap month " : "month "}${Math.abs(
          info.lunar.month
        )} · day ${info.lunar.day}`
    : "";
  const solarText = info
    ? locale === "zh"
      ? `${info.solar.year} 年 ${info.solar.month} 月 ${info.solar.day} 日`
      : new Date(info.solar.year, info.solar.month - 1, info.solar.day).toLocaleDateString(
          "en-US",
          { year: "numeric", month: "long", day: "numeric" }
        )
    : "";
  const bigText = info ? (mode === "solar2lunar" ? lunarText : solarText) : "";
  const subText = info
    ? mode === "solar2lunar"
      ? `${info.solar.year}-${pad(info.solar.month)}-${pad(info.solar.day)}`
      : lunarText
    : "";

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <Segmented
          ariaLabel={t.solar2lunar}
          value={mode}
          onChange={setMode}
          options={[
            { value: "solar2lunar", label: t.solar2lunar },
            { value: "lunar2solar", label: t.lunar2solar },
          ]}
        />

        {mode === "solar2lunar" ? (
          <>
            <span className="text-xs text-foreground-muted">{t.solarDate}</span>
            <Input
              type="date"
              value={solarInput}
              onChange={(e) => setSolarInput(e.target.value)}
              aria-label={t.solarDate}
              className="w-44 font-mono text-sm"
              size="xs"
            />
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={setToday}
              className="gap-1.5"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              {t.today}
            </Button>
          </>
        ) : (
          <>
            <span className="text-xs text-foreground-muted">{t.lunarDate}</span>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min={1900}
                max={2100}
                value={year}
                onChange={(e) => changeYear(Number(e.target.value))}
                aria-label={t.year}
                className="w-20 text-center font-mono text-sm"
                size="xs"
              />
              <span className="text-xs text-foreground-subtle">{t.year}</span>
            </div>
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger size="xs" aria-label={t.month} className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(day)} onValueChange={(v) => setDay(Number(v))}>
              <SelectTrigger size="xs" aria-label={t.day} className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dayOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={setToday}
              className="gap-1.5"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              {t.today}
            </Button>
          </>
        )}
      </OptionBar>

      {result.error && <p className="text-xs text-red-fg">{result.error}</p>}

      {info ? (
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface px-6 py-10">
          <div className="flex flex-col items-center gap-2">
            <span className="font-display text-3xl font-semibold text-foreground sm:text-4xl">
              {bigText}
            </span>
            <span className="font-mono text-sm text-foreground-muted">{subText}</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <Badge variant="secondary" size="sm">
              {weekday}
            </Badge>
            <Badge variant="outline" size="sm">
              {t.ganzhi} {info.ganzhi}
            </Badge>
            <Badge variant="outline" size="sm">
              {t.zodiac} {locale === "zh" ? info.zodiac : (ZODIAC_EN[info.zodiac] ?? info.zodiac)}
            </Badge>
            {info.jieqi && (
              <Badge variant="warning" size="sm" dot>
                {t.jieqi} {info.jieqi}
              </Badge>
            )}
            {info.festivals.map((festival) => (
              <Badge key={festival} variant="success" size="sm" dot>
                {festival}
              </Badge>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 font-mono text-[11px] text-foreground-faint">
            <span>
              {t.solarResult} {info.solar.year}-{pad(info.solar.month)}-{pad(info.solar.day)}
            </span>
            <span>
              {t.lunarResult} {lunarText}
            </span>
          </div>
        </div>
      ) : (
        <p className="py-12 text-center text-sm text-foreground-subtle">{t.empty}</p>
      )}

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}

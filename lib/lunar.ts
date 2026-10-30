/**
 * Thin wrapper over lunar-javascript: converts between the Gregorian and
 * Chinese lunar calendars and normalises the extra info the UI shows.
 */
import { Lunar, LunarUtil, LunarYear, Solar } from "lunar-javascript";

export interface LunarInfo {
  solar: { year: number; month: number; day: number };
  lunar: {
    year: number;
    /** Negative means a leap month */
    month: number;
    day: number;
    monthName: string;
    dayName: string;
    isLeapMonth: boolean;
  };
  yearChinese: string;
  ganzhi: string;
  zodiac: string;
  jieqi: string;
  festivals: string[];
}

export const LUNAR_MONTH_NAMES = LunarUtil.MONTH;
export const LUNAR_DAY_NAMES = LunarUtil.DAY;

function build(lunar: Lunar): LunarInfo {
  const solar = lunar.getSolar();
  const month = lunar.getMonth();

  return {
    solar: {
      year: solar.getYear(),
      month: solar.getMonth(),
      day: solar.getDay(),
    },
    lunar: {
      year: lunar.getYear(),
      month,
      day: lunar.getDay(),
      monthName: `${month < 0 ? "闰" : ""}${LUNAR_MONTH_NAMES[Math.abs(month)]}`,
      dayName: LUNAR_DAY_NAMES[lunar.getDay()],
      isLeapMonth: month < 0,
    },
    yearChinese: lunar.getYearInChinese(),
    ganzhi: lunar.getYearInGanZhi(),
    zodiac: lunar.getYearShengXiao(),
    jieqi: lunar.getJieQi(),
    festivals: [...solar.getFestivals(), ...lunar.getFestivals()],
  };
}

export function solarToLunar(year: number, month: number, day: number): LunarInfo | null {
  try {
    return build(Solar.fromYmd(year, month, day).getLunar());
  } catch {
    return null;
  }
}

export function lunarToSolar(year: number, month: number, day: number): LunarInfo | null {
  try {
    const lunar = Lunar.fromYmd(year, month, day);
    const info = build(lunar);
    // Reject dates the month does not have (e.g. 三十 in a 29-day month):
    // the library silently rolls them over, so round-trip and compare.
    if (info.lunar.year !== year || info.lunar.month !== month || info.lunar.day !== day) {
      return null;
    }
    return info;
  } catch {
    return null;
  }
}

/** Month options for a lunar year, including the leap month when it has one */
export function lunarMonthOptions(year: number): { value: number; label: string }[] {
  let leapMonth = 0;
  try {
    leapMonth = LunarYear.fromYear(year).getLeapMonth();
  } catch {
    leapMonth = 0;
  }

  const options: { value: number; label: string }[] = [];
  for (let m = 1; m <= 12; m++) {
    options.push({ value: m, label: `${LUNAR_MONTH_NAMES[m]}月` });
    if (m === leapMonth) {
      options.push({ value: -m, label: `闰${LUNAR_MONTH_NAMES[m]}月` });
    }
  }
  return options;
}

export function lunarDayOptions(): { value: number; label: string }[] {
  return Array.from({ length: 30 }, (_, i) => ({
    value: i + 1,
    label: LUNAR_DAY_NAMES[i + 1],
  }));
}

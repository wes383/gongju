/**
 * Age maths for the birthday tool.
 *
 * Calendar arithmetic is done on local dates: a birthday is a calendar event,
 * not an instant, so a leap day on the other side of a DST change must still
 * count as exactly one day.
 */

const DAY_MS = 86_400_000;

export type ZodiacSign =
  | "capricorn"
  | "aquarius"
  | "pisces"
  | "aries"
  | "taurus"
  | "gemini"
  | "cancer"
  | "leo"
  | "virgo"
  | "libra"
  | "scorpio"
  | "sagittarius";

export interface AgeBreakdown {
  years: number;
  months: number;
  days: number;
  totalMonths: number;
  totalWeeks: number;
  totalDays: number;
  /** Days until the next birthday; 0 means today. */
  daysToNextBirthday: number;
  /** The age that birthday will be. */
  nextAge: number;
  /** 0 = Sunday, matching Date#getDay. */
  weekday: number;
  zodiac: ZodiacSign;
}

/** Midnight timestamp in UTC so day differences ignore DST shifts. */
function dayStamp(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Add months without spilling: 31 Jan + 1 month is 28 (or 29) Feb, not 3 Mar. */
function addMonths(date: Date, months: number): Date {
  const total = date.getMonth() + months;
  const year = date.getFullYear() + Math.floor(total / 12);
  const month = ((total % 12) + 12) % 12;
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(date.getDate(), lastDay));
}

/** The birthday as it falls in a given year; 29 Feb becomes 28 Feb off-leap. */
export function birthdayIn(year: number, birth: Date): Date {
  const month = birth.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(birth.getDate(), lastDay));
}

const ZODIAC_STARTS: [number, number, ZodiacSign][] = [
  [1, 20, "aquarius"],
  [2, 19, "pisces"],
  [3, 21, "aries"],
  [4, 20, "taurus"],
  [5, 21, "gemini"],
  [6, 22, "cancer"],
  [7, 23, "leo"],
  [8, 23, "virgo"],
  [9, 23, "libra"],
  [10, 24, "scorpio"],
  [11, 23, "sagittarius"],
  [12, 22, "capricorn"],
];

export function zodiacOf(month: number, day: number): ZodiacSign {
  let sign: ZodiacSign = "capricorn";
  for (const [startMonth, startDay, name] of ZODIAC_STARTS) {
    if (month > startMonth || (month === startMonth && day >= startDay)) sign = name;
  }
  return sign;
}

/**
 * Calendar distance between two dates, e.g. 1 Feb 2000 → 1 Mar 2001 gives
 * 1 year 1 month 0 days. Returns null when either date is invalid or the
 * birthday is in the future relative to `at`.
 */
export function ageBetween(birth: Date, at: Date): AgeBreakdown | null {
  if (Number.isNaN(birth.getTime()) || Number.isNaN(at.getTime())) return null;

  const from = new Date(birth.getFullYear(), birth.getMonth(), birth.getDate());
  const to = new Date(at.getFullYear(), at.getMonth(), at.getDate());
  if (from > to) return null;

  let totalMonths = (to.getFullYear() - from.getFullYear()) * 12 + to.getMonth() - from.getMonth();
  let anchor = addMonths(from, totalMonths);
  if (anchor > to) {
    totalMonths -= 1;
    anchor = addMonths(from, totalMonths);
  }

  const days = Math.round((dayStamp(to) - dayStamp(anchor)) / DAY_MS);
  const totalDays = Math.round((dayStamp(to) - dayStamp(from)) / DAY_MS);

  let next = birthdayIn(to.getFullYear(), from);
  if (next < to) next = birthdayIn(to.getFullYear() + 1, from);

  return {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
    days,
    totalMonths,
    totalWeeks: Math.floor(totalDays / 7),
    totalDays,
    daysToNextBirthday: Math.round((dayStamp(next) - dayStamp(to)) / DAY_MS),
    nextAge: next.getFullYear() - from.getFullYear(),
    weekday: from.getDay(),
    zodiac: zodiacOf(from.getMonth() + 1, from.getDate()),
  };
}

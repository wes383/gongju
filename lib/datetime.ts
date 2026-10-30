/**
 * Date/time helpers: timestamp parsing, time-zone conversion,
 * calendar arithmetic and differences.
 */

/* ══════════════════════════════════════════════════════════════
   Parsing
   ══════════════════════════════════════════════════════════════ */

export type TimestampUnit = "s" | "ms" | "us" | "ns";

export interface ParsedInstant {
  date: Date;
  kind: "timestamp" | "date";
  unit?: TimestampUnit;
}

/** Seconds, milliseconds, microseconds or nanoseconds, judged by digit count */
export function parseInstant(input: string): ParsedInstant | null {
  const raw = input.trim();
  if (!raw) return null;

  if (/^-?\d+$/.test(raw)) {
    const digits = raw.replace("-", "").length;
    let unit: TimestampUnit;
    let ms: number;

    if (digits <= 10) {
      unit = "s";
      ms = Number(raw) * 1000;
    } else if (digits <= 13) {
      unit = "ms";
      ms = Number(raw);
    } else if (digits <= 16) {
      unit = "us";
      ms = Number(raw) / 1000;
    } else {
      unit = "ns";
      ms = Number(raw) / 1_000_000;
    }

    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : { date, kind: "timestamp", unit };
  }

  // Normalise "2026-10-30 18:00" — Safari refuses the space form
  const normalised = raw.includes("T") ? raw : raw.replace(" ", "T");
  const date = new Date(normalised);
  return Number.isNaN(date.getTime()) ? null : { date, kind: "date" };
}

export function timestampOf(date: Date, unit: TimestampUnit): number {
  const ms = date.getTime();
  switch (unit) {
    case "s":
      return Math.floor(ms / 1000);
    case "ms":
      return Math.floor(ms);
    case "us":
      return Math.floor(ms * 1000);
    case "ns":
      return Math.floor(ms * 1_000_000);
  }
}

/* ══════════════════════════════════════════════════════════════
   Time zones
   ══════════════════════════════════════════════════════════════ */

export interface ZoneParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export function zoneParts(date: Date, timeZone: string): ZoneParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-10-30 18:00:00" in the given zone */
export function formatInZone(date: Date, timeZone: string): string {
  const p = zoneParts(date, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)} ${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}`;
}

export function weekdayInZone(date: Date, timeZone: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { timeZone, weekday: "short" }).format(date);
}

/** Offset in minutes, e.g. +480 for UTC+8 */
export function zoneOffsetMinutes(date: Date, timeZone: string): number {
  const p = zoneParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  // Round to the minute: some zones have second-level historical offsets
  return Math.round((asUtc - date.getTime()) / 60000);
}

export function offsetLabel(minutes: number): string {
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  return `UTC${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** Turn a wall-clock time in a zone into a real instant */
export function zonedTimeToDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const offset = zoneOffsetMinutes(guess, timeZone);
  return new Date(guess.getTime() - offset * 60000);
}

/** Default value for <input type="datetime-local"> in a zone */
export function toDatetimeLocalValue(date: Date, timeZone?: string): string {
  if (!timeZone) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
      date.getHours()
    )}:${pad(date.getMinutes())}`;
  }
  const p = zoneParts(date, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/* ══════════════════════════════════════════════════════════════
   Arithmetic
   ══════════════════════════════════════════════════════════════ */

export type DateUnit = "year" | "month" | "week" | "day" | "hour" | "minute" | "workday";

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function addToDate(date: Date, amount: number, unit: DateUnit): Date {
  const next = new Date(date.getTime());

  switch (unit) {
    case "year":
    case "month": {
      const months = unit === "year" ? amount * 12 : amount;
      const targetMonth = next.getMonth() + months;
      const day = next.getDate();
      next.setDate(1);
      next.setMonth(targetMonth);
      // Clamp: Jan 31 + 1 month lands on Feb 28/29, not Mar 3
      next.setDate(Math.min(day, daysInMonth(next.getFullYear(), next.getMonth() + 1)));
      return next;
    }
    case "week":
      next.setDate(next.getDate() + amount * 7);
      return next;
    case "day":
      next.setDate(next.getDate() + amount);
      return next;
    case "workday":
      return addWorkdays(next, amount);
    case "hour":
      next.setTime(next.getTime() + amount * 3600_000);
      return next;
    case "minute":
      next.setTime(next.getTime() + amount * 60_000);
      return next;
  }
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function addWorkdays(date: Date, amount: number): Date {
  const next = new Date(date.getTime());
  const step = amount >= 0 ? 1 : -1;
  let remaining = Math.abs(amount);

  while (remaining > 0) {
    next.setDate(next.getDate() + step);
    if (!isWeekend(next)) remaining--;
  }
  return next;
}

/** Weekdays between two instants; the end day only counts when it is a weekday */
export function countWorkdays(from: Date, to: Date): number {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  const forward = start <= end;
  const a = forward ? start : end;
  const b = forward ? end : start;

  let count = 0;
  const cursor = new Date(a.getTime());
  while (cursor < b) {
    cursor.setDate(cursor.getDate() + 1);
    if (!isWeekend(cursor)) count++;
  }
  return forward ? count : -count;
}

/* ══════════════════════════════════════════════════════════════
   Differences
   ══════════════════════════════════════════════════════════════ */

export interface DateDiff {
  /** Absolute milliseconds between the two instants */
  ms: number;
  /** Signed, rounded down */
  totalDays: number;
  totalHours: number;
  totalMinutes: number;
  years: number;
  months: number;
  days: number;
  workdays: number;
}

export function diffDates(from: Date, to: Date): DateDiff {
  const ms = Math.abs(to.getTime() - from.getTime());
  const forward = to.getTime() >= from.getTime();
  const a = forward ? from : to;
  const b = forward ? to : from;

  let years = b.getFullYear() - a.getFullYear();
  let months = b.getMonth() - a.getMonth();
  let days = b.getDate() - a.getDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(b.getFullYear(), b.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  const sign = forward ? 1 : -1;

  return {
    ms,
    totalDays: sign * Math.floor(ms / 86_400_000),
    totalHours: sign * Math.floor(ms / 3_600_000),
    totalMinutes: sign * Math.floor(ms / 60_000),
    years,
    months,
    days,
    workdays: countWorkdays(from, to),
  };
}

/* ══════════════════════════════════════════════════════════════
   Relative time
   ══════════════════════════════════════════════════════════════ */

export function relativeTime(date: Date, now: Date, locale: string): string {
  const diffSeconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  const abs = Math.abs(diffSeconds);
  if (abs < 60) return rtf.format(diffSeconds, "second");
  if (abs < 3600) return rtf.format(Math.round(diffSeconds / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(diffSeconds / 3600), "hour");
  if (abs < 2_592_000) return rtf.format(Math.round(diffSeconds / 86_400), "day");
  if (abs < 31_536_000) return rtf.format(Math.round(diffSeconds / 2_592_000), "month");
  return rtf.format(Math.round(diffSeconds / 31_536_000), "year");
}

/** "3 天 04:12:09" style breakdown for countdowns */
export function formatDuration(ms: number): { days: number; hh: string; mm: string; ss: string } {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86_400),
    hh: pad(Math.floor((total % 86_400) / 3600)),
    mm: pad(Math.floor((total % 3600) / 60)),
    ss: pad(total % 60),
  };
}

export const COMMON_TIMEZONES = [
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Europe/London",
  "Europe/Paris",
  "Europe/Moscow",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Australia/Sydney",
  "Pacific/Auckland",
  "UTC",
];

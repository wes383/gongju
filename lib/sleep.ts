/**
 * Sleep timing around 90-minute cycles.
 *
 * A cycle is an approximation — 90 minutes is the population average and real
 * sleep drifts — so the results are shown as a shortlist, never as one answer.
 */

import { codedError } from "./errors";

export const CYCLE_MINUTES = 90;
export const DEFAULT_LATENCY = 15;

export interface SleepSlot {
  cycles: number;
  /** Clock time in minutes after midnight, 0–1439 */
  clock: number;
  /** Total time in bed, including the time it takes to fall asleep */
  totalMinutes: number;
}

const TIME_RE = /^(\d{1,2}):(\d{2})$/;

/** "23:30" → 1410 minutes after midnight */
export function parseClock(text: string): number {
  const match = text.trim().match(TIME_RE);
  if (!match) throw codedError("sleep.time", text);
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) throw codedError("sleep.time", text);
  return hours * 60 + minutes;
}

export function formatClock(minutes: number): string {
  const normalised = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const hours = Math.floor(normalised / 60);
  const rest = normalised % 60;
  return `${String(hours).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function checkLatency(latency: number): void {
  if (!Number.isFinite(latency) || latency < 0 || latency > 120) throw codedError("sleep.latency");
}

/**
 * Given a bedtime, the times to set the alarm so it lands at the end of a
 * cycle rather than in the middle of one.
 */
export function wakeTimes(
  bedTime: string,
  latency = DEFAULT_LATENCY,
  cycle = CYCLE_MINUTES
): SleepSlot[] {
  checkLatency(latency);
  if (!Number.isFinite(cycle) || cycle < 60 || cycle > 120) throw codedError("sleep.cycle");
  const bed = parseClock(bedTime);
  return [4, 5, 6, 7].map((cycles) => {
    const totalMinutes = latency + cycles * cycle;
    return { cycles, clock: bed + totalMinutes, totalMinutes };
  });
}

/** The same list read backwards: go to bed now to wake up at a chosen time */
export function bedTimes(
  wakeTime: string,
  latency = DEFAULT_LATENCY,
  cycle = CYCLE_MINUTES
): SleepSlot[] {
  checkLatency(latency);
  if (!Number.isFinite(cycle) || cycle < 60 || cycle > 120) throw codedError("sleep.cycle");
  const wake = parseClock(wakeTime);
  return [4, 5, 6, 7].map((cycles) => {
    const totalMinutes = latency + cycles * cycle;
    return { cycles, clock: wake - totalMinutes, totalMinutes };
  });
}

/** "7 小时 45 分" style split, without the unit words */
export function splitHours(totalMinutes: number): { hours: number; minutes: number } {
  const whole = Math.max(0, Math.round(totalMinutes));
  return { hours: Math.floor(whole / 60), minutes: whole % 60 };
}

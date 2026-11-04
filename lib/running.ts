/**
 * Running pace arithmetic. Everything is stored as seconds per kilometre so
 * there is one canonical unit; miles and speeds are derived from it.
 */

import { codedError } from "./errors";

const METRES_PER_MILE = 1609.344;

export interface Pace {
  secondsPerKm: number;
  secondsPerMile: number;
  kmh: number;
  mph: number;
}

export interface RaceDistance {
  id: string;
  meters: number;
  name: { zh: string; en: string };
}

export const RACE_DISTANCES: RaceDistance[] = [
  { id: "mile", meters: METRES_PER_MILE, name: { zh: "1 英里", en: "1 mile" } },
  { id: "5k", meters: 5000, name: { zh: "5 公里", en: "5 km" } },
  { id: "10k", meters: 10000, name: { zh: "10 公里", en: "10 km" } },
  { id: "half", meters: 21097.5, name: { zh: "半程马拉松", en: "Half marathon" } },
  { id: "full", meters: 42195, name: { zh: "全程马拉松", en: "Marathon" } },
];

function positive(value: number, code: string): number {
  if (!Number.isFinite(value) || value <= 0) throw codedError(code);
  return value;
}

/** Pace from a distance covered in a given time */
export function paceOf(meters: number, seconds: number): Pace {
  positive(meters, "run.distance");
  positive(seconds, "run.time");
  const secondsPerKm = (seconds / meters) * 1000;
  return {
    secondsPerKm,
    secondsPerMile: secondsPerKm * (METRES_PER_MILE / 1000),
    kmh: 3600 / secondsPerKm,
    mph: 3600 / (secondsPerKm * (METRES_PER_MILE / 1000)),
  };
}

/** Pace from a speed in km/h */
export function paceFromKmh(kmh: number): Pace {
  positive(kmh, "run.speed");
  const secondsPerKm = 3600 / kmh;
  return {
    secondsPerKm,
    secondsPerMile: secondsPerKm * (METRES_PER_MILE / 1000),
    kmh,
    mph: kmh / (METRES_PER_MILE / 1000),
  };
}

/** Time needed to cover a distance at a given pace */
export function timeOf(meters: number, secondsPerKm: number): number {
  positive(meters, "run.distance");
  positive(secondsPerKm, "run.pace");
  return (secondsPerKm / 1000) * meters;
}

/**
 * Riegel's endurance model: T2 = T1 × (D2 / D1)^1.06.
 * Good enough over similar distances, optimistic once the jump gets large.
 */
export function riegel(seconds: number, fromMeters: number, toMeters: number, exponent = 1.06): number {
  positive(seconds, "run.time");
  positive(fromMeters, "run.distance");
  positive(toMeters, "run.distance");
  return seconds * (toMeters / fromMeters) ** exponent;
}

/** Round to whole seconds first, so 59.7 s becomes the next minute, not 4:60 */
function clock(seconds: number): { minutes: number; seconds: number } {
  const total = Math.round(seconds);
  return { minutes: Math.floor(total / 60), seconds: total % 60 };
}

/** "4:32" — the format every race result page uses */
export function formatPace(secondsPerUnit: number): string {
  if (!Number.isFinite(secondsPerUnit) || secondsPerUnit <= 0) return "—";
  const { minutes, seconds } = clock(secondsPerUnit);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** "1:23:45" (or "43:21" under an hour) for durations */
export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "—";
  const whole = Math.round(totalSeconds);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const seconds = whole % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${minutes}:${ss}`;
}

/**
 * Accepts "4:32", "4:32/km", "9:05/mi" or a bare number of minutes ("4.5").
 * Returns seconds per kilometre, or null when the text is not a pace.
 */
export function parsePace(text: string, unit: "km" | "mi" = "km"): number | null {
  const raw = text.trim().toLowerCase();
  if (raw === "") return null;
  const explicitMile = /\/\s*mi\b|per\s*mi\b/.test(raw);
  const explicitKm = /\/\s*km\b|per\s*km\b/.test(raw);
  const cleaned = raw.replace(/\s*(\/\s*(km|mi)|per\s*(km|mi))\s*$/, "");
  const match = cleaned.match(/^(\d+(?:\.\d+)?)(?::(\d{1,2}))?$/);
  if (!match) return null;

  const minutes = Number(match[1]);
  const seconds = match[2] ? Number(match[2]) : 0;
  if (!Number.isFinite(minutes) || seconds >= 60) return null;
  const perUnit = minutes * 60 + seconds;
  if (perUnit <= 0) return null;

  const asMile = explicitMile ? true : explicitKm ? false : unit === "mi";
  return asMile ? (perUnit / METRES_PER_MILE) * 1000 : perUnit;
}

export interface Split {
  index: number;
  /** Metres covered by this split */
  meters: number;
  seconds: number;
  cumulative: number;
}

/**
 * Even splits for a target time. The last split is whatever is left over, so
 * a 10K in 50:00 shows four full kilometres and a 5K finishing split.
 */
export function splits(totalSeconds: number, meters: number, everyMeters = 1000): Split[] {
  positive(totalSeconds, "run.time");
  positive(meters, "run.distance");
  if (!Number.isFinite(everyMeters) || everyMeters <= 0) throw codedError("run.distance");

  const count = Math.ceil(meters / everyMeters);
  const pace = totalSeconds / meters;
  const out: Split[] = [];
  for (let index = 0; index < count; index += 1) {
    const start = index * everyMeters;
    const length = Math.min(everyMeters, meters - start);
    const seconds = length * pace;
    out.push({
      index: index + 1,
      meters: length,
      seconds,
      cumulative: (start + length) * pace,
    });
  }
  return out;
}

export { METRES_PER_MILE };

/** Byte counts as people read them: 340 MB, 1.2 GB */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = unit === 0 || value >= 100 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[unit]}`;
}

/** Durations split at a second so a page load reads as either ms or s */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${Math.round(ms)} ms`;
}

/**
 * `Date#getTimezoneOffset` counts minutes *behind* UTC, so the sign flips on
 * the way in: 480 becomes UTC+08:00.
 */
export function formatUtcOffset(minutes: number): string {
  if (!Number.isFinite(minutes)) return "—";
  const sign = minutes >= 0 ? "+" : "-";
  const total = Math.abs(Math.round(minutes));
  const hours = String(Math.floor(total / 60)).padStart(2, "0");
  const rest = String(total % 60).padStart(2, "0");
  return `UTC${sign}${hours}:${rest}`;
}

export interface UaBrand {
  brand: string;
  version: string;
}

/**
 * The brand worth showing out of UA client hints. Chromium is the engine every
 * Chromium browser reports, and "Not.A/Brand" is the deliberate decoy, so the
 * last real name wins — Google Chrome over Chromium, Edge over both.
 */
export function pickUaBrand(brands: readonly UaBrand[] | undefined): string | null {
  if (!brands?.length) return null;
  const named = brands.filter((item) => !/not.?a.?brand/i.test(item.brand));
  const real = named.filter((item) => item.brand !== "Chromium");
  const pick = real[real.length - 1] ?? named[named.length - 1];
  return pick ? `${pick.brand} ${pick.version}` : null;
}

export type DeviceKind = "mobile" | "tablet" | "desktop";

/**
 * Client hints settle it when they exist; otherwise the UA string does. iPadOS
 * reports a Macintosh UA, so a Mac with more than one touch point is an iPad.
 */
export function deviceKind(input: {
  mobile?: boolean;
  maxTouchPoints?: number;
  userAgent: string;
}): DeviceKind {
  if (input.mobile) return "mobile";
  const ua = input.userAgent;
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua)) return "tablet";
  if (/Macintosh/i.test(ua) && (input.maxTouchPoints ?? 0) > 1) return "tablet";
  if (/Mobi|iPhone|Android/i.test(ua)) return "mobile";
  return "desktop";
}

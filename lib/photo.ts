/**
 * Photographic exposure, depth of field and ND filter arithmetic.
 *
 * Lengths are millimetres and times are seconds, matching how lenses are
 * marked; the UI is responsible for any cm / inch presentation.
 */
import { codedError } from "./errors";
import { formatNumber } from "./units";

export type SensorId = "medium" | "full" | "apsc" | "apsc-canon" | "m43" | "one";

export interface Sensor {
  id: SensorId;
  name: { zh: string; en: string };
  /** Sensor width and height in mm */
  width: number;
  height: number;
  /** Circle of confusion: the diagonal divided by 1500 */
  coc: number;
  /** Crop factor against a 36 × 24 frame */
  crop: number;
}

const FULL_DIAGONAL = Math.hypot(36, 24);

function sensor(id: SensorId, zh: string, en: string, width: number, height: number): Sensor {
  const diagonal = Math.hypot(width, height);
  return {
    id,
    name: { zh, en },
    width,
    height,
    coc: diagonal / 1500,
    crop: FULL_DIAGONAL / diagonal,
  };
}

export const SENSORS: Sensor[] = [
  sensor("medium", "中画幅 44 × 33", "Medium format 44 × 33", 44, 33),
  sensor("full", "全画幅 36 × 24", "Full frame 36 × 24", 36, 24),
  sensor("apsc", "APS-C 23.6 × 15.7", "APS-C 23.6 × 15.7", 23.6, 15.7),
  sensor("apsc-canon", "APS-C 佳能 22.3 × 14.9", "Canon APS-C 22.3 × 14.9", 22.3, 14.9),
  sensor("m43", "M4/3 17.3 × 13", "Micro Four Thirds 17.3 × 13", 17.3, 13),
  sensor("one", "1 英寸 13.2 × 8.8", "1 inch 13.2 × 8.8", 13.2, 8.8),
];

export function getSensor(id: SensorId): Sensor {
  const found = SENSORS.find((item) => item.id === id);
  if (!found) throw codedError("photo.sensor", id);
  return found;
}

/* ------------------------------------------------------------------ exposure */

export interface ExposureInput {
  /** f-number, e.g. 2.8 */
  aperture: number;
  /** Seconds */
  shutter: number;
  iso: number;
}

export interface ExposureResult {
  /** EV at the chosen ISO */
  ev: number;
  /** EV normalised to ISO 100, the usual way of quoting scene brightness */
  ev100: number;
}

export function exposureValue({ aperture, shutter, iso }: ExposureInput): ExposureResult {
  if (!Number.isFinite(aperture) || aperture <= 0) throw codedError("photo.aperture");
  if (!Number.isFinite(shutter) || shutter <= 0) throw codedError("photo.shutter");
  if (!Number.isFinite(iso) || iso <= 0) throw codedError("photo.iso");
  const ev = Math.log2((aperture * aperture) / shutter);
  return { ev, ev100: ev - Math.log2(iso / 100) };
}

/** Shutter that keeps the same EV at a different aperture */
export function shutterFor(ev: number, aperture: number): number {
  if (!Number.isFinite(aperture) || aperture <= 0) throw codedError("photo.aperture");
  return (aperture * aperture) / Math.pow(2, ev);
}

/** Aperture that keeps the same EV at a different shutter */
export function apertureFor(ev: number, shutter: number): number {
  if (!Number.isFinite(shutter) || shutter <= 0) throw codedError("photo.shutter");
  return Math.sqrt(shutter * Math.pow(2, ev));
}

/** Difference in stops between two exposures; positive means the second is darker */
export function stopsBetween(a: ExposureInput, b: ExposureInput): number {
  return exposureValue(b).ev - exposureValue(a).ev;
}

/** Full-stop shutter denominators: an ND calculation lands between them, and
 * a camera can only be set to one of these anyway. */
const FULL_STOP_DENOMINATORS = [8000, 4000, 2000, 1000, 500, 250, 125, 60, 30, 15, 8, 4, 2, 1];

function snapDenominator(denominator: number): number {
  for (const standard of FULL_STOP_DENOMINATORS) {
    if (Math.abs(standard - denominator) / standard <= 0.06) return standard;
  }
  return Math.round(denominator);
}

/** "1/125" for fast speeds, "2.5"" and "1'30"" once it gets long */
export function formatShutter(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  if (seconds < 1) {
    return `1/${formatNumber(snapDenominator(1 / seconds), 6)}`;
  }
  if (seconds < 60) return `${formatNumber(seconds, 4)}"`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds - minutes * 60;
  return `${minutes}'${formatNumber(rest, 3)}"`;
}

/** Accepts "1/125", "0.008" or "2" and returns seconds */
export function parseShutter(text: string): number {
  const cleaned = text.trim().replace(/["″s]/gi, "");
  if (cleaned === "") throw codedError("photo.shutter");
  const fraction = cleaned.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  const value = fraction ? Number(fraction[1]) / Number(fraction[2]) : Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) throw codedError("photo.shutter");
  return value;
}

/* -------------------------------------------------------------- depth of field */

export interface DofInput {
  /** Focal length in mm */
  focal: number;
  aperture: number;
  /** Focus distance in metres */
  distance: number;
  sensorId: SensorId;
}

export interface DofResult {
  /** Hyperfocal distance in metres */
  hyperfocal: number;
  /** Near and far limits in metres; Infinity when the far limit is unbounded */
  near: number;
  far: number;
  /** Total depth of field in metres, Infinity when far is unbounded */
  total: number;
  /** Circle of confusion used, in mm */
  coc: number;
  /** 35 mm equivalent focal length */
  equivalent: number;
  /** Subject magnification at the focus distance */
  magnification: number;
}

export function depthOfField({ focal, aperture, distance, sensorId }: DofInput): DofResult {
  const sensor = getSensor(sensorId);
  if (!Number.isFinite(focal) || focal <= 0) throw codedError("photo.focal");
  if (!Number.isFinite(aperture) || aperture <= 0) throw codedError("photo.aperture");
  if (!Number.isFinite(distance) || distance <= 0) throw codedError("photo.distance");

  const f = focal;
  const s = distance * 1000;
  const c = sensor.coc;
  const hyperfocalMm = (f * f) / (aperture * c) + f;

  const nearMm = (s * (hyperfocalMm - f)) / (hyperfocalMm + s - 2 * f);
  const farMm = s >= hyperfocalMm ? Number.POSITIVE_INFINITY : (s * (hyperfocalMm - f)) / (hyperfocalMm - s);
  const total = farMm === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : farMm - nearMm;

  return {
    hyperfocal: hyperfocalMm / 1000,
    near: nearMm / 1000,
    far: farMm / 1000,
    total: total / 1000,
    coc: c,
    equivalent: focal * sensor.crop,
    magnification: f / Math.max(1e-9, s - f),
  };
}

/* ------------------------------------------------------------------- ND filter */

/** ND filters are marked by their light-reduction factor: ND1000 passes 1/1000 */
export const ND_FILTERS = [2, 4, 8, 16, 32, 64, 100, 400, 1000, 100000] as const;

export function ndStops(nd: number): number {
  if (!Number.isFinite(nd) || nd <= 1) throw codedError("photo.nd");
  return Math.log2(nd);
}

/** New shutter after adding `stops` of light loss */
export function ndShutter(base: number, stops: number): number {
  if (!Number.isFinite(base) || base <= 0) throw codedError("photo.shutter");
  if (!Number.isFinite(stops) || stops < 0) throw codedError("photo.ndStops");
  return base * Math.pow(2, stops);
}

/** How many stops separate two shutter speeds */
export function shutterStops(from: number, to: number): number {
  if (!Number.isFinite(from) || from <= 0 || !Number.isFinite(to) || to <= 0) {
    throw codedError("photo.shutter");
  }
  return Math.log2(to / from);
}

/**
 * Network throughput units.
 *
 * Two families meet here: bits per second (what carriers advertise) and bytes
 * per second (what download managers show). Everything converts through bits,
 * and the decimal prefixes match the way bandwidth is sold.
 */

export interface SpeedUnit {
  id: string;
  /** Short symbol shown next to inputs and results */
  symbol: string;
  /** Size of one unit in bits */
  bits: number;
}

export const SPEED_UNITS: SpeedUnit[] = [
  { id: "bps", symbol: "bit/s", bits: 1 },
  { id: "kbps", symbol: "kbit/s", bits: 1e3 },
  { id: "mbps", symbol: "Mbit/s", bits: 1e6 },
  { id: "gbps", symbol: "Gbit/s", bits: 1e9 },
  { id: "Bps", symbol: "B/s", bits: 8 },
  { id: "kBps", symbol: "KB/s", bits: 8e3 },
  { id: "mBps", symbol: "MB/s", bits: 8e6 },
  { id: "gBps", symbol: "GB/s", bits: 8e9 },
];

export function getSpeedUnit(id: string): SpeedUnit {
  return SPEED_UNITS.find((u) => u.id === id) ?? SPEED_UNITS[0];
}

/** Convert a value between two throughput units */
export function convertSpeed(value: number, from: string, to: string): number {
  if (!Number.isFinite(value)) return NaN;
  return (value * getSpeedUnit(from).bits) / getSpeedUnit(to).bits;
}

/** Seconds needed to move `bytes` over a link of `bitsPerSecond` */
export function transferSeconds(bytes: number, bitsPerSecond: number): number {
  if (!Number.isFinite(bytes) || !Number.isFinite(bitsPerSecond) || bitsPerSecond <= 0) {
    return NaN;
  }
  return (bytes * 8) / bitsPerSecond;
}

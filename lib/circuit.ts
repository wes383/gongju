/**
 * Basic DC circuit maths: Ohm's law, voltage dividers and battery runtime.
 *
 * All inputs and outputs are SI (volts, amps, ohms, watts, milliamp-hours) —
 * the UI is responsible for any mA / mV conversion so the numbers here stay
 * directly comparable.
 */
import { codedError } from "./errors";

export type OhmKey = "voltage" | "current" | "resistance" | "power";

export interface OhmValues {
  voltage: number;
  current: number;
  resistance: number;
  power: number;
}

const LABELS: Record<OhmKey, string> = {
  voltage: "voltage",
  current: "current",
  resistance: "resistance",
  power: "power",
};

/** Digits that agree within 1 % are treated as the same circuit */
const CONSISTENCY = 0.01;

function close(a: number, b: number): boolean {
  const scale = Math.max(Math.abs(a), Math.abs(b));
  if (scale === 0) return true;
  return Math.abs(a - b) / scale <= CONSISTENCY;
}

/**
 * Solve the V/I/R/P square from any two knowns.
 *
 * `P` is never an independent variable (P = V·I), so the pair order matters:
 * the first pair that can be solved without dividing by zero wins, and any
 * further values are only used to sanity-check the answer.
 */
export function solveOhms(input: Partial<Record<OhmKey, number | null>>): OhmValues {
  const known: Partial<Record<OhmKey, number>> = {};
  for (const key of Object.keys(LABELS) as OhmKey[]) {
    const value = input[key];
    if (value === undefined || value === null || Number.isNaN(value)) continue;
    if (!Number.isFinite(value)) throw codedError("ohm.invalid", LABELS[key]);
    if (value < 0) throw codedError("ohm.negative", LABELS[key]);
    known[key] = value;
  }
  if (Object.keys(known).length < 2) throw codedError("ohm.needTwo");
  if (known.resistance !== undefined && known.resistance <= 0) {
    throw codedError("ohm.positiveResistance");
  }

  const { voltage: v, current: i, resistance: r, power: p } = known;
  let result: OhmValues;

  if (v !== undefined && i !== undefined) {
    if (i === 0) {
      if (v !== 0) throw codedError("ohm.zeroDivide", "current");
      throw codedError("ohm.degenerate");
    }
    result = { voltage: v, current: i, resistance: v / i, power: v * i };
  } else if (v !== undefined && r !== undefined) {
    result = { voltage: v, current: v / r, resistance: r, power: (v * v) / r };
  } else if (i !== undefined && r !== undefined) {
    result = { voltage: i * r, current: i, resistance: r, power: i * i * r };
  } else if (v !== undefined && p !== undefined) {
    if (v === 0) throw codedError("ohm.zeroDivide", "voltage");
    const current = p / v;
    if (current === 0) throw codedError("ohm.degenerate");
    result = { voltage: v, current, resistance: v / current, power: p };
  } else if (i !== undefined && p !== undefined) {
    if (i === 0) throw codedError("ohm.zeroDivide", "current");
    result = { voltage: p / i, current: i, resistance: p / (i * i), power: p };
  } else if (r !== undefined && p !== undefined) {
    if (r === 0) throw codedError("ohm.positiveResistance");
    const current = Math.sqrt(p / r);
    if (current === 0) throw codedError("ohm.degenerate");
    result = { voltage: current * r, current, resistance: r, power: p };
  } else {
    throw codedError("ohm.needTwo");
  }

  for (const key of Object.keys(known) as OhmKey[]) {
    const given = known[key]!;
    if (key === "resistance" && result.resistance <= 0) throw codedError("ohm.positiveResistance");
    if (!close(given, result[key])) throw codedError("ohm.mismatch", LABELS[key]);
  }
  return result;
}

export interface DividerInput {
  vin: number;
  r1: number;
  r2: number;
  /** Optional load in parallel with R2 */
  load?: number | null;
}

export interface DividerResult {
  vout: number;
  /** Vout / Vin, 0–1 for a resistive divider */
  ratio: number;
  /** Current through R1 */
  current: number;
  /** R2 in parallel with the load, or R2 alone */
  lowerLeg: number;
  r1Power: number;
  r2Power: number;
  loadPower: number;
  loadCurrent: number;
  totalPower: number;
  loaded: boolean;
}

export function voltageDivider(input: DividerInput): DividerResult {
  const { vin, r1, r2 } = input;
  const load = input.load ?? null;
  if (!Number.isFinite(vin) || !Number.isFinite(r1) || !Number.isFinite(r2)) {
    throw codedError("ohm.invalid", "divider");
  }
  if (vin < 0) throw codedError("ohm.negative", "voltage");
  if (r1 <= 0) throw codedError("ohm.positiveResistance");
  if (r2 <= 0) throw codedError("ohm.positiveResistance");
  if (load !== null && (!Number.isFinite(load) || load <= 0)) {
    throw codedError("div.load");
  }

  const lowerLeg = load === null ? r2 : (r2 * load) / (r2 + load);
  const current = vin / (r1 + lowerLeg);
  const vout = current * lowerLeg;
  const loadCurrent = load === null ? current : vout / load;

  return {
    vout,
    ratio: vin === 0 ? 0 : vout / vin,
    current,
    lowerLeg,
    r1Power: current * current * r1,
    r2Power: (vout * vout) / r2,
    loadPower: load === null ? 0 : (vout * vout) / load,
    loadCurrent,
    totalPower: vin * current,
    loaded: load !== null,
  };
}

export interface BatteryInput {
  /** Pack capacity in mAh */
  capacityMah: number;
  /** Nominal pack voltage */
  voltage: number;
  /** Average draw in mA — either this or loadW */
  loadMa?: number | null;
  loadW?: number | null;
  /** Share of the rated capacity that is actually usable, 0–1 */
  usable?: number;
}

export interface BatteryResult {
  hours: number;
  days: number;
  /** Nominal energy in Wh */
  wh: number;
  loadMa: number;
  averagePower: number;
  usableMah: number;
}

export function batteryLife(input: BatteryInput): BatteryResult {
  const usable = input.usable ?? 0.8;
  const { capacityMah, voltage } = input;
  if (!Number.isFinite(capacityMah) || capacityMah <= 0) throw codedError("bat.capacity");
  if (!Number.isFinite(voltage) || voltage <= 0) throw codedError("bat.voltage");
  if (!(usable > 0 && usable <= 1)) throw codedError("bat.usable");

  const loadMa = input.loadMa ?? (input.loadW ? (input.loadW * 1000) / voltage : null);
  if (loadMa === null || !Number.isFinite(loadMa) || loadMa <= 0) throw codedError("bat.load");

  const hours = (capacityMah * usable) / loadMa;
  return {
    hours,
    days: hours / 24,
    wh: (capacityMah / 1000) * voltage,
    loadMa,
    averagePower: (loadMa / 1000) * voltage,
    usableMah: capacityMah * usable,
  };
}

/** "2 天 6 小时" style split, so long runtimes stay readable */
export function splitDuration(hours: number): { days: number; hours: number; minutes: number } {
  if (!Number.isFinite(hours) || hours < 0) return { days: 0, hours: 0, minutes: 0 };
  const totalMinutes = Math.round(hours * 60);
  return {
    days: Math.floor(totalMinutes / 1440),
    hours: Math.floor((totalMinutes % 1440) / 60),
    minutes: totalMinutes % 60,
  };
}

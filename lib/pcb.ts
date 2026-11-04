/**
 * PCB trace sizing with the IPC-2221 curve fit.
 *
 * The charts in IPC-2221 are approximated by
 *   A[mil²] = (I / (k · ΔT^0.44))^(1 / 0.725)
 * with k = 0.048 for outer layers and 0.024 for inner layers. Width follows
 * from the copper thickness, so a 2 oz board halves the width for the same
 * cross-section.
 */
import { codedError } from "./errors";

export type CopperWeight = 0.5 | 1 | 2 | 3;
export type LayerType = "external" | "internal";

export const COPPER_WEIGHTS: CopperWeight[] = [0.5, 1, 2, 3];

/** 1 oz copper is 35 µm, i.e. 1.378 mil */
const MIL_PER_OZ = 1.378;
const MM_PER_MIL = 0.0254;
/** Copper resistivity at 20 °C and its temperature coefficient */
const RHO_20 = 1.724e-8;
const ALPHA = 0.00393;

export interface TraceInput {
  /** Amps */
  current: number;
  /** Allowed temperature rise in °C */
  deltaT: number;
  copperOz: CopperWeight;
  layer: LayerType;
  /** Trace length in mm, used for the drop calculation */
  lengthMm?: number;
}

export interface TraceResult {
  /** Minimum cross-section in mil² */
  areaMil2: number;
  widthMil: number;
  widthMm: number;
  thicknessMm: number;
  /** Trace resistance at 20 °C + ΔT */
  resistance: number;
  voltageDrop: number;
  powerLoss: number;
  /** Temperature used for the resistance figure, °C */
  tempC: number;
}

export function traceWidth(input: TraceInput): TraceResult {
  const { current, deltaT, copperOz, layer } = input;
  const lengthMm = input.lengthMm ?? 0;
  if (!Number.isFinite(current) || current <= 0) throw codedError("pcb.current");
  if (!Number.isFinite(deltaT) || deltaT <= 0) throw codedError("pcb.deltaT");
  if (!COPPER_WEIGHTS.includes(copperOz)) throw codedError("pcb.copper");
  if (!Number.isFinite(lengthMm) || lengthMm < 0) throw codedError("pcb.length");

  const k = layer === "external" ? 0.048 : 0.024;
  const areaMil2 = Math.pow(current / (k * Math.pow(deltaT, 0.44)), 1 / 0.725);
  const thicknessMil = copperOz * MIL_PER_OZ;
  const widthMil = areaMil2 / thicknessMil;
  const widthMm = widthMil * MM_PER_MIL;
  const thicknessMm = thicknessMil * MM_PER_MIL;

  const tempC = 20 + deltaT;
  const areaM2 = widthMm * 1e-3 * thicknessMm * 1e-3;
  const resistance =
    lengthMm === 0 ? 0 : (RHO_20 * (1 + ALPHA * deltaT) * (lengthMm * 1e-3)) / areaM2;

  return {
    areaMil2,
    widthMil,
    widthMm,
    thicknessMm,
    resistance,
    voltageDrop: current * resistance,
    powerLoss: current * current * resistance,
    tempC,
  };
}

/** Round up to the next 0.05 mm, which is roughly what a fab can etch */
export function roundUpWidth(mm: number): number {
  if (!Number.isFinite(mm) || mm <= 0) return 0;
  return Math.ceil(mm / 0.05) * 0.05;
}

/**
 * Ampacity of an existing trace — the inverse of `traceWidth`, handy when
 * checking a layout you already have.
 */
export function traceCurrent(widthMm: number, copperOz: CopperWeight, deltaT: number, layer: LayerType): number {
  if (!Number.isFinite(widthMm) || widthMm <= 0) throw codedError("pcb.width");
  if (!Number.isFinite(deltaT) || deltaT <= 0) throw codedError("pcb.deltaT");
  const k = layer === "external" ? 0.048 : 0.024;
  const areaMil2 = (widthMm / MM_PER_MIL) * copperOz * MIL_PER_OZ;
  return k * Math.pow(deltaT, 0.44) * Math.pow(areaMil2, 0.725);
}

/**
 * Timing operations for subtitle cues: shifting, frame-rate remapping,
 * two-point alignment and a lightweight sanity check.
 *
 * All arithmetic works on milliseconds and never mutates the input array.
 */

import { normalizeCues, visibleLength, type Cue } from "@/lib/subtitle";

/** Move every cue by `deltaMs` (negative values move it earlier) */
export function shiftCues(cues: Cue[], deltaMs: number): Cue[] {
  return cues.map((cue) => ({
    ...cue,
    start: Math.max(0, Math.round(cue.start + deltaMs)),
    end: Math.max(0, Math.round(cue.end + deltaMs)),
  }));
}

/** Scale cue times around an anchor, used for speed-up / slow-down fixes */
export function scaleCues(cues: Cue[], factor: number, anchorMs = 0): Cue[] {
  if (!Number.isFinite(factor) || factor <= 0) return [...cues];
  return cues.map((cue) => ({
    ...cue,
    start: Math.round(anchorMs + (cue.start - anchorMs) * factor),
    end: Math.round(anchorMs + (cue.end - anchorMs) * factor),
  }));
}

/**
 * Remap subtitles authored for one frame rate onto another.
 *
 * A 23.976 → 25 conversion speeds the video up, so subtitles must move earlier:
 * every timestamp is multiplied by `from / to`.
 */
export function remapFps(cues: Cue[], fromFps: number, toFps: number): Cue[] {
  if (!(fromFps > 0) || !(toFps > 0)) return [...cues];
  return scaleCues(cues, fromFps / toFps, 0);
}

/** Stretch or squeeze the whole track so the first start and last end match */
export function alignCues(cues: Cue[], firstStart: number, lastEnd: number): Cue[] {
  const sorted = normalizeCues(cues);
  if (sorted.length === 0) return [];

  const sourceStart = sorted[0].start;
  const sourceEnd = sorted[sorted.length - 1].end;
  const span = sourceEnd - sourceStart;
  if (span <= 0 || lastEnd <= firstStart) return shiftCues(sorted, firstStart - sourceStart);

  const factor = (lastEnd - firstStart) / span;
  return sorted.map((cue) => ({
    ...cue,
    start: Math.max(0, Math.round(firstStart + (cue.start - sourceStart) * factor)),
    end: Math.max(0, Math.round(firstStart + (cue.end - sourceStart) * factor)),
  }));
}

export interface TimingPlan {
  /** Uniform offset applied last */
  shiftMs: number;
  /** Optional frame-rate conversion applied first */
  fps?: { from: number; to: number };
  /** Optional two-point alignment applied before the offset */
  align?: { firstStart: number; lastEnd: number };
  /** Minimum cue duration enforced at the end */
  minDuration?: number;
  /** Cut a cue where the next one starts, removing overlaps */
  fixOverlaps?: boolean;
}

/** Apply a timing plan in a fixed order: fps → align → shift → normalise */
export function applyTiming(cues: Cue[], plan: TimingPlan): Cue[] {
  let result = [...cues];
  if (plan.fps && plan.fps.from > 0 && plan.fps.to > 0) {
    result = remapFps(result, plan.fps.from, plan.fps.to);
  }
  if (plan.align) {
    result = alignCues(result, plan.align.firstStart, plan.align.lastEnd);
  }
  if (plan.shiftMs) {
    result = shiftCues(result, plan.shiftMs);
  }
  result = normalizeCues(result, plan.minDuration ?? 0);
  if (plan.fixOverlaps) result = trimOverlaps(result, plan.minDuration ?? 0);
  return result;
}

function trimOverlaps(cues: Cue[], minDuration: number): Cue[] {
  return cues.map((cue, index) => {
    const next = cues[index + 1];
    if (!next || cue.end <= next.start) return cue;
    const end = Math.max(cue.start + minDuration, next.start);
    return { ...cue, end: Math.min(cue.end, end) };
  });
}

export type CueIssueKind = "negative" | "zero" | "overlap" | "fast" | "long";

export interface CueIssue {
  index: number;
  kind: CueIssueKind;
  /** Characters per second for "fast", longest line length for "long" */
  value: number;
}

/** Readability thresholds used by subtitle editors for CJK and Latin text */
export const MAX_CPS = 20;
export const MAX_LINE_CHARS = 42;

export function inspectCues(cues: Cue[]): CueIssue[] {
  const issues: CueIssue[] = [];
  cues.forEach((cue, index) => {
    const duration = cue.end - cue.start;
    if (duration < 0) issues.push({ index, kind: "negative", value: duration });
    else if (duration === 0) issues.push({ index, kind: "zero", value: 0 });

    const previous = cues[index - 1];
    if (previous && cue.start < previous.end) {
      issues.push({ index, kind: "overlap", value: previous.end - cue.start });
    }

    const seconds = duration / 1000;
    if (seconds > 0) {
      const cps = visibleLength(cue.text) / seconds;
      if (cps > MAX_CPS) issues.push({ index, kind: "fast", value: cps });
    }

    const longest = Math.max(0, ...cue.text.split("\n").map((line) => visibleLength(line)));
    if (longest > MAX_LINE_CHARS) issues.push({ index, kind: "long", value: longest });
  });
  return issues;
}

/**
 * Bilingual subtitle helpers.
 *
 * Merging pairs two single-language tracks by time overlap; a translation cue is
 * assigned to the primary cue it overlaps most, so a coarse translation line is
 * never duplicated across several short originals.
 */

import { normalizeCues, type Cue } from "@/lib/subtitle";

export interface MergeOptions {
  /** Put the translation above the original text */
  translationFirst?: boolean;
  /**
   * Pairing tolerance for tracks whose timing is slightly off. When a cue has no
   * overlap at all, it falls back to the nearest cue within this gap.
   */
  toleranceMs?: number;
}

function overlapMs(a: Cue, b: Cue): number {
  return Math.min(a.end, b.end) - Math.max(a.start, b.start);
}

function gapMs(a: Cue, b: Cue): number {
  return Math.max(0, Math.max(a.start, b.start) - Math.min(a.end, b.end));
}

export function mergeBilingual(
  primary: Cue[],
  secondary: Cue[],
  options: MergeOptions = {}
): Cue[] {
  const first = normalizeCues(primary);
  const second = normalizeCues(secondary);
  if (first.length === 0) return [];
  if (second.length === 0) return first;

  const tolerance = options.toleranceMs ?? 400;

  const assigned = new Map<number, string[]>();
  for (const cue of second) {
    let bestIndex = -1;
    let bestOverlap = 0;
    first.forEach((target, index) => {
      const overlap = overlapMs(target, cue);
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        bestIndex = index;
      }
    });

    if (bestIndex < 0) {
      let bestGap = tolerance + 1;
      first.forEach((target, index) => {
        const gap = gapMs(target, cue);
        if (gap <= tolerance && gap < bestGap) {
          bestGap = gap;
          bestIndex = index;
        }
      });
    }

    if (bestIndex < 0) continue;
    const bucket = assigned.get(bestIndex) ?? [];
    bucket.push(cue.text);
    assigned.set(bestIndex, bucket);
  }

  return first.map((cue, index) => {
    const extras = assigned.get(index);
    if (!extras || extras.length === 0) return cue;

    // Several translation cues mapped onto one original: keep them on one line
    const translation = extras.join(" ").replace(/\s*\n\s*/g, " ").trim();
    const original = cue.text.trim();
    const text = options.translationFirst ? `${translation}\n${original}` : `${original}\n${translation}`;
    return { ...cue, text };
  });
}

export interface SplitResult {
  primary: Cue[];
  secondary: Cue[];
}

/** Split a bilingual track back into two single-language tracks */
export function splitBilingual(cues: Cue[]): SplitResult {
  const primary: Cue[] = [];
  const secondary: Cue[] = [];

  for (const cue of cues) {
    const lines = cue.text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length < 2) {
      primary.push(cue);
      continue;
    }
    primary.push({ ...cue, text: lines[0] });
    secondary.push({ ...cue, text: lines.slice(1).join("\n") });
  }

  return { primary, secondary };
}

/** Swap the two lines of every bilingual cue, e.g. translation first */
export function swapCueLines(cues: Cue[]): Cue[] {
  return cues.map((cue) => {
    const lines = cue.text.split("\n");
    if (lines.length < 2) return cue;
    return { ...cue, text: [...lines].reverse().join("\n") };
  });
}

/**
 * Unbiased random draws for the random-number, dice and lottery tools.
 *
 * Everything goes through crypto.getRandomValues rather than Math.random so the
 * results are suitable for anything a user might treat as a real draw.
 */

const scratch = new Uint32Array(2);

/** Uniform float in [0, 1) carrying 53 bits of randomness. */
export function randomUnit(): number {
  crypto.getRandomValues(scratch);
  return (scratch[0] * 2 ** 21 + (scratch[1] >>> 11)) / 2 ** 53;
}

/** Integer in [min, max], both ends included. */
export function randomInteger(min: number, max: number): number {
  const lo = Math.ceil(Math.min(min, max));
  const hi = Math.floor(Math.max(min, max));
  const span = hi - lo + 1;
  if (!Number.isFinite(span) || span < 1) throw new RangeError("empty range");
  return lo + Math.floor(randomUnit() * span);
}

/** Decimal in [min, max) rounded to `decimals` places. */
export function randomDecimal(min: number, max: number, decimals: number): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const places = Math.min(Math.max(Math.trunc(decimals), 0), 12);
  return Number((lo + randomUnit() * (hi - lo)).toFixed(places));
}

/**
 * Draw `count` integers from [min, max].
 *
 * Unique draws use partial Fisher-Yates while the span is small enough to hold
 * in memory, and a rejection loop beyond that so a huge range never allocates.
 */
export function randomIntegers(
  min: number,
  max: number,
  count: number,
  unique: boolean
): number[] {
  const lo = Math.ceil(Math.min(min, max));
  const hi = Math.floor(Math.max(min, max));
  const span = hi - lo + 1;
  const n = Math.max(1, Math.trunc(count));
  if (!Number.isFinite(span) || span < 1) throw new RangeError("empty range");

  if (!unique) return Array.from({ length: n }, () => randomInteger(lo, hi));
  if (n > span) throw new RangeError("more values than the range holds");

  if (span <= 20_000) {
    const pool = Array.from({ length: span }, (_, i) => lo + i);
    for (let i = 0; i < n; i += 1) {
      const j = i + Math.floor(randomUnit() * (span - i));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, n);
  }

  const picked = new Set<number>();
  while (picked.size < n) picked.add(randomInteger(lo, hi));
  return [...picked];
}

export function rollDice(sides: number, count: number): number[] {
  const faces = Math.max(2, Math.trunc(sides));
  return Array.from({ length: Math.max(1, Math.trunc(count)) }, () => randomInteger(1, faces));
}

/** Draw without replacement: no entry is picked twice. */
export function drawSample<T>(items: T[], count: number): T[] {
  const pool = items.slice();
  const n = Math.min(Math.max(1, Math.trunc(count)), pool.length);
  for (let i = 0; i < n; i += 1) {
    const j = i + Math.floor(randomUnit() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}

import type { TokenizerFamily } from "@/lib/tokens";

/**
 * Exact token counts for the families whose vocabulary can be shipped.
 *
 * `gpt-tokenizer` inlines the BPE merge ranks in its JS chunks — ~2.4 MB for
 * o200k_base and ~1.2 MB for cl100k_base — so both imports below stay dynamic.
 * Turbopack turns them into separate chunks that are only fetched when the user
 * opts into exact mode, which keeps the tool page's initial payload untouched.
 * Anthropic, Google and Meta do not publish a redistributable vocabulary, so
 * those families keep using the estimator in `lib/tokens.ts`.
 */

export type ExactFamily = "o200k" | "cl100k";

const COUNTERS: Record<ExactFamily, () => Promise<(text: string) => number>> = {
  o200k: () => import("gpt-tokenizer/encoding/o200k_base").then((m) => m.countTokens),
  cl100k: () => import("gpt-tokenizer/encoding/cl100k_base").then((m) => m.countTokens),
};

/** Whether a family has a real vocabulary we can load on demand */
export function supportsExact(family: TokenizerFamily): family is ExactFamily {
  return family === "o200k" || family === "cl100k";
}

/** Count with the model's own BPE ranks. Loads the vocabulary on first call. */
export async function countTokensExact(text: string, family: ExactFamily): Promise<number> {
  const count = await COUNTERS[family]();
  return count(text);
}

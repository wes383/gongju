import { runRegex } from "@/lib/text";

interface RegexRequest {
  id: number;
  pattern: string;
  flags: string;
  input: string;
  replacement: string;
}

interface WorkerScope {
  postMessage: (message: unknown) => void;
  onmessage: ((event: MessageEvent<RegexRequest>) => void) | null;
}

const ctx = self as unknown as WorkerScope;

/**
 * Matching runs off the main thread so a pathological pattern
 * (catastrophic backtracking) can be killed by the caller instead of
 * freezing the page.
 */
ctx.onmessage = (event) => {
  const { id, pattern, flags, input, replacement } = event.data;
  try {
    const result = runRegex(pattern, flags, input, replacement);
    ctx.postMessage({ id, ok: true, result });
  } catch (error) {
    ctx.postMessage({
      id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

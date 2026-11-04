/**
 * KaTeX rendering for the LaTeX preview tool.
 *
 * The renderer is pulled in through `import()`: katex plus its font files is by
 * far the heaviest thing on a page whose main job is to show one formula, and
 * the module is only cached once the tool actually renders something.
 *
 * `splitMath` is the pure part and carries most of the tests. It finds
 * `$…$`, `$$…$$`, `\(…\)` and `\[…\]` inside pasted prose, so a paragraph with
 * a few formulas can be previewed without dragging in a Markdown parser.
 */

import { codedError } from "./errors";

export interface MathSegment {
  kind: "text" | "inline" | "display";
  value: string;
}

export interface RenderOptions {
  /** Centred block formula instead of an inline one */
  display?: boolean;
}

let loaded: Promise<typeof import("katex")> | null = null;

function loadKatex(): Promise<typeof import("katex")> {
  loaded ??= import("katex");
  return loaded;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Splits mixed prose and math into segments. An escaped `\$` is literal text;
 * an unterminated delimiter swallows the rest as text rather than throwing,
 * because people type while they look at the preview.
 */
export function splitMath(source: string): MathSegment[] {
  const segments: MathSegment[] = [];
  let text = "";

  const flush = () => {
    if (text) segments.push({ kind: "text", value: text });
    text = "";
  };

  let i = 0;
  while (i < source.length) {
    if (source.startsWith("\\$", i)) {
      text += "$";
      i += 2;
      continue;
    }

    const delimiter = source.startsWith("$$", i)
      ? { open: "$$", close: "$$", kind: "display" as const }
      : source.startsWith("\\[", i)
        ? { open: "\\[", close: "\\]", kind: "display" as const }
        : source.startsWith("\\(", i)
          ? { open: "\\(", close: "\\)", kind: "inline" as const }
          : source[i] === "$"
            ? { open: "$", close: "$", kind: "inline" as const }
            : null;

    if (!delimiter) {
      text += source[i];
      i += 1;
      continue;
    }

    const start = i + delimiter.open.length;
    const end = source.indexOf(delimiter.close, start);
    if (end === -1) {
      text += source.slice(i);
      break;
    }

    flush();
    segments.push({ kind: delimiter.kind, value: source.slice(start, end) });
    i = end + delimiter.close.length;
  }

  flush();
  return segments;
}

/** KaTeX's ParseError keeps the useful part in `rawMessage`, position included */
function parseFailure(error: unknown): never {
  const raw = error as { rawMessage?: string; message?: string };
  const message = (raw.rawMessage ?? raw.message ?? "").replace(/^KaTeX parse error:\s*/, "");
  throw codedError("latex.parse", message || "unknown");
}

export async function renderLatex(source: string, options: RenderOptions = {}): Promise<string> {
  const loadedModule = await loadKatex();
  // katex ships CommonJS; depending on the bundler the namespace itself may
  // already carry renderToString, so accept both shapes.
  const katex = loadedModule.default ?? (loadedModule as unknown as typeof loadedModule.default);
  try {
    return katex.renderToString(source, {
      displayMode: options.display ?? false,
      throwOnError: true,
      strict: false,
      trust: false,
      output: "htmlAndMathml",
    });
  } catch (error) {
    parseFailure(error);
  }
}

/** Renders a mix of prose and `$…$` / `$$…$$` / `\(…\)` / `\[…\]` formulas */
export async function renderDocument(source: string): Promise<string> {
  const segments = splitMath(source);
  const html = await Promise.all(
    segments.map((segment) =>
      segment.kind === "text"
        ? Promise.resolve(escapeHtml(segment.value))
        : renderLatex(segment.value, { display: segment.kind === "display" })
    )
  );
  return html.join("");
}

/**
 * The `<math>` subtree KaTeX embeds next to its visual HTML. Copying that into
 * Word, Notion or a paper keeps the formula editable instead of pasting spans.
 */
export function mathmlFrom(html: string): string {
  const match = html.match(/<math[\s\S]*?<\/math>/);
  return match ? match[0] : "";
}

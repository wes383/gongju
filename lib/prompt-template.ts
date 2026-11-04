/**
 * `{{variable}}` prompt templates with batch rendering.
 *
 * Templates are deliberately tiny: only `{{name}}` interpolation, no loops or
 * conditionals. Anything fancier belongs in real code, and a mini language
 * would need its own error reporting, escaping rules and documentation.
 */

import Papa from "papaparse";
import { codedError } from "./errors";

export interface TemplatePart {
  kind: "text" | "var";
  text: string;
  /** Variable name, only set for `var` parts */
  name?: string;
}

export interface TemplateVariable {
  name: string;
  count: number;
}

/** Names are conservative so they survive CSV headers and JSON keys */
const NAME = /^[A-Za-z0-9_.-]+$/;
const PLACEHOLDER = /\{\{\s*([^{}]*?)\s*\}\}/g;

/** A `{{` with no `}}` anywhere after it is almost always a typo */
function hasUnclosedPlaceholder(source: string): boolean {
  let index = source.indexOf("{{");
  while (index !== -1) {
    const close = source.indexOf("}}", index + 2);
    if (close === -1) return true;
    index = source.indexOf("{{", close + 2);
  }
  return false;
}

export function parseTemplate(source: string): TemplatePart[] {
  if (hasUnclosedPlaceholder(source)) throw codedError("ai.unclosed");

  const parts: TemplatePart[] = [];
  let last = 0;

  for (const match of source.matchAll(PLACEHOLDER)) {
    const start = match.index ?? 0;
    const name = match[1].trim();

    if (start > last) parts.push({ kind: "text", text: source.slice(last, start) });
    // Anything that is not a plain name stays literal, so pasting JSON or
    // template-engine code into the prompt does not corrupt it
    if (NAME.test(name)) {
      parts.push({ kind: "var", text: match[0], name });
    } else {
      parts.push({ kind: "text", text: match[0] });
    }
    last = start + match[0].length;
  }

  if (last < source.length) parts.push({ kind: "text", text: source.slice(last) });
  return parts;
}

export function collectVariables(source: string): TemplateVariable[] {
  const counts = new Map<string, number>();
  for (const part of parseTemplate(source)) {
    if (part.kind === "var" && part.name) {
      counts.set(part.name, (counts.get(part.name) ?? 0) + 1);
    }
  }
  return [...counts].map(([name, count]) => ({ name, count }));
}

export type MissingPolicy = "keep" | "blank";

export interface RenderOptions {
  /** What to do with a variable that has no value at all */
  missing?: MissingPolicy;
}

/** Names referenced by the template but absent from `values` */
export function unresolvedVariables(
  source: string,
  values: Record<string, string | undefined>
): string[] {
  return collectVariables(source)
    .map((item) => item.name)
    .filter((name) => values[name] === undefined);
}

export function renderTemplate(
  source: string,
  values: Record<string, string | undefined>,
  options: RenderOptions = {}
): string {
  const missing = options.missing ?? "keep";
  return parseTemplate(source)
    .map((part) => {
      if (part.kind === "text" || !part.name) return part.text;
      const value = values[part.name];
      if (value !== undefined) return value;
      return missing === "blank" ? "" : part.text;
    })
    .join("");
}

/** Trim trailing spaces per line: models notice "  " leftovers more than we do */
export function tidyPrompt(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export type BatchFormat = "csv" | "json" | "jsonl";

export interface BatchRows {
  rows: Record<string, string>[];
  format: BatchFormat;
}

function scalar(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function normalise(row: unknown): Record<string, string> | null {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
    out[key] = scalar(value);
  }
  return out;
}

function asArray(parsed: unknown): unknown[] | null {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object") {
    const record = parsed as Record<string, unknown>;
    for (const key of ["rows", "data", "items", "records"]) {
      if (Array.isArray(record[key])) return record[key] as unknown[];
    }
  }
  return null;
}

function fromJsonl(text: string): Record<string, string>[] | null {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
  if (lines.length === 0) return null;

  const rows: Record<string, string>[] = [];
  for (const line of lines) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      return null;
    }
    const row = normalise(parsed);
    if (!row) return null;
    rows.push(row);
  }
  return rows;
}

/**
 * Read batch data from CSV, a JSON array or JSON Lines. JSON is tried first so
 * a JSONL file is not mistaken for single-column CSV.
 */
export function parseBatch(text: string): BatchRows {
  const trimmed = text.trim();
  if (!trimmed) throw codedError("ai.empty");

  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const rows = asArray(JSON.parse(trimmed))
        ?.map(normalise)
        .filter((row): row is Record<string, string> => row !== null);
      if (!rows || rows.length === 0) throw codedError("ai.batch");
      return { rows, format: "json" };
    } catch (error) {
      if (error instanceof Error && "code" in error) throw error;
      // Not JSON after all; fall through to JSONL / CSV
    }
  }

  const jsonl = fromJsonl(trimmed);
  if (jsonl && jsonl.length > 0) return { rows: jsonl, format: "jsonl" };

  const parsed = Papa.parse<Record<string, unknown>>(trimmed, {
    header: true,
    skipEmptyLines: "greedy",
  });
  const fields = parsed.meta.fields?.filter((field) => field.trim() !== "") ?? [];
  if (fields.length === 0) throw codedError("ai.batch");

  const rows = parsed.data
    .map(normalise)
    .filter((row): row is Record<string, string> => row !== null);
  if (rows.length === 0) throw codedError("ai.batch");

  return { rows, format: "csv" };
}

export interface BatchRender {
  outputs: string[];
  /** Variables missing from at least one row */
  missing: string[];
}

export function renderBatch(
  source: string,
  rows: Record<string, string>[],
  options: RenderOptions = {}
): BatchRender {
  const names = collectVariables(source).map((item) => item.name);
  const missing = new Set<string>();

  const outputs = rows.map((row) => {
    for (const name of names) {
      if (row[name] === undefined) missing.add(name);
    }
    return renderTemplate(source, row, options);
  });

  return { outputs, missing: [...missing] };
}

export type ExportFormat = "json" | "jsonl" | "csv" | "text";

/** Pair each row with its rendered prompt so the export stays traceable */
export function serializeBatch(
  rows: Record<string, string>[],
  outputs: string[],
  format: ExportFormat
): string {
  const records = rows.map((row, index) => ({ ...row, output: outputs[index] ?? "" }));

  switch (format) {
    case "json":
      return JSON.stringify(records, null, 2);
    case "jsonl":
      return records.map((record) => JSON.stringify(record)).join("\n");
    case "text":
      return outputs.join("\n\n---\n\n");
    case "csv": {
      const fields = [...new Set(records.flatMap((record) => Object.keys(record)))];
      return Papa.unparse(records, { columns: fields, newline: "\r\n" });
    }
  }
}

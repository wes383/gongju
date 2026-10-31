/**
 * JSON Schema helpers: infer a draft-07 schema from a sample document, and
 * validate data against a schema with ajv (loaded on demand).
 */

export type JsonSchema = Record<string, unknown>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const URI_RE = /^https?:\/\/[^\s]+$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_RE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IPV4_RE = /^(\d{1,3}\.){3}\d{1,3}$/;

export function detectFormat(value: string): string | null {
  if (EMAIL_RE.test(value)) return "email";
  if (URI_RE.test(value)) return "uri";
  if (DATETIME_RE.test(value)) return "date-time";
  if (DATE_RE.test(value)) return "date";
  if (UUID_RE.test(value)) return "uuid";
  if (IPV4_RE.test(value)) return "ipv4";
  return null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Merge two property schemas produced for the same key */
function mergeSchemas(a: JsonSchema, b: JsonSchema): JsonSchema {
  const typeA = a.type;
  const typeB = b.type;

  if (typeA === typeB) {
    if (typeA === "object") {
      return mergeObjectSchemas(a, b);
    }
    if (typeA === "array") {
      const itemsA = a.items as JsonSchema | undefined;
      const itemsB = b.items as JsonSchema | undefined;
      if (!itemsA) return b;
      if (!itemsB) return a;
      return { type: "array", items: mergeSchemas(itemsA, itemsB) };
    }
    // Same primitive: keep the first format only when both agree
    const merged: JsonSchema = { ...a };
    if (a.format !== b.format) delete merged.format;
    return merged;
  }

  if (typeof typeA === "string" && typeof typeB === "string") {
    return { type: [typeA, typeB] };
  }
  // Anything else (object vs array, mixed with null) is simply untyped
  return {};
}

function mergeObjectSchemas(a: JsonSchema, b: JsonSchema): JsonSchema {
  const propsA = (a.properties as Record<string, JsonSchema>) ?? {};
  const propsB = (b.properties as Record<string, JsonSchema>) ?? {};
  const keys = new Set([...Object.keys(propsA), ...Object.keys(propsB)]);
  const properties: Record<string, JsonSchema> = {};
  for (const key of keys) {
    const left = propsA[key];
    const right = propsB[key];
    properties[key] = left && right ? mergeSchemas(left, right) : (left ?? right);
  }

  const requiredA = new Set((a.required as string[]) ?? []);
  const requiredB = new Set((b.required as string[]) ?? []);
  const required = [...requiredA].filter((key) => requiredB.has(key));

  const merged: JsonSchema = { type: "object", properties };
  if (required.length > 0) merged.required = required;
  if (a.additionalProperties === false && b.additionalProperties === false) {
    merged.additionalProperties = false;
  }
  return merged;
}

/** Build the schema for a single value */
export function inferSchema(value: unknown): JsonSchema {
  if (value === null) return { type: "null" };

  if (Array.isArray(value)) {
    if (value.length === 0) return { type: "array" };
    const items = value
      .map((item) => inferSchema(item))
      .reduce((acc, next) => mergeSchemas(acc, next));
    return { type: "array", items };
  }

  if (isPlainObject(value)) {
    const properties: Record<string, JsonSchema> = {};
    for (const [key, child] of Object.entries(value)) {
      properties[key] = inferSchema(child);
    }
    const schema: JsonSchema = { type: "object", properties };
    const keys = Object.keys(value);
    if (keys.length > 0) schema.required = keys;
    return schema;
  }

  switch (typeof value) {
    case "string": {
      const format = detectFormat(value);
      return format ? { type: "string", format } : { type: "string" };
    }
    case "number":
      return Number.isInteger(value) ? { type: "integer" } : { type: "number" };
    case "boolean":
      return { type: "boolean" };
    default:
      return {};
  }
}

export function schemaFromSample(sample: unknown): string {
  return JSON.stringify(inferSchema(sample), null, 2);
}

/* ══════════════════════════════════════════════════════════════
   Validation
   ══════════════════════════════════════════════════════════════ */

export interface SchemaIssue {
  /** JSON pointer-ish path such as `items[0].price`, empty for the root */
  path: string;
  keyword: string;
  params: Record<string, unknown>;
}

export type ValidationResult =
  | { ok: true }
  | { ok: false; kind: "schema"; message: string }
  | { ok: false; kind: "data"; message: string }
  | { ok: false; kind: "invalid"; issues: SchemaIssue[] };

interface AjvLike {
  compile(schema: unknown): (data: unknown) => boolean;
  errors?: unknown;
}

type AjvErrors = {
  errors?: {
    instancePath?: string;
    keyword: string;
    params: Record<string, unknown>;
  }[] | null;
};

let cached: AjvLike | null = null;

async function getAjv(): Promise<AjvLike> {
  if (cached) return cached;
  const mod = await import("ajv");
  const Ajv = (mod.default ?? mod) as unknown as new (options?: object) => AjvLike;
  const ajv = new Ajv({ allErrors: true, strict: false, allowUnionTypes: true });

  const formats: [string, RegExp][] = [
    ["email", EMAIL_RE],
    ["uri", URI_RE],
    ["date", DATE_RE],
    ["date-time", DATETIME_RE],
    ["uuid", UUID_RE],
    ["ipv4", IPV4_RE],
  ];
  for (const [name, regex] of formats) {
    (ajv as unknown as { addFormat: (name: string, format: RegExp) => void }).addFormat(
      name,
      regex
    );
  }
  cached = ajv;
  return ajv;
}

function toPath(instancePath: string): string {
  if (!instancePath) return "";
  return instancePath
    .replace(/^\//, "")
    .replace(/\//g, ".")
    .replace(/(\d+)/g, "[$1]")
    .replace(/\.\[/g, "[");
}

/**
 * Validate `dataText` against `schemaText`. Both are raw JSON strings so the
 * UI can report parse errors separately from schema errors.
 */
export async function validateJson(
  schemaText: string,
  dataText: string
): Promise<ValidationResult> {
  let schema: unknown;
  try {
    schema = JSON.parse(schemaText);
  } catch (e) {
    return { ok: false, kind: "schema", message: e instanceof Error ? e.message : String(e) };
  }

  let data: unknown;
  try {
    data = JSON.parse(dataText);
  } catch (e) {
    return { ok: false, kind: "data", message: e instanceof Error ? e.message : String(e) };
  }

  let validate: (data: unknown) => boolean;
  try {
    const ajv = await getAjv();
    validate = ajv.compile(schema);
  } catch (e) {
    return { ok: false, kind: "schema", message: e instanceof Error ? e.message : String(e) };
  }

  if (validate(data)) return { ok: true };

  const errors = (validate as unknown as AjvErrors).errors ?? [];
  return {
    ok: false,
    kind: "invalid",
    issues: errors.map((error) => ({
      path: toPath(error.instancePath ?? ""),
      keyword: error.keyword,
      params: error.params ?? {},
    })),
  };
}

/** Human readable text for one issue, localised in the component */
export function describeIssue(
  issue: SchemaIssue,
  messages: Record<string, (params: Record<string, unknown>, path: string) => string>
): string {
  const render = messages[issue.keyword];
  if (render) return render(issue.params, issue.path);
  return `${issue.path || "(root)"}: ${issue.keyword}`;
}

export const SCHEMA_SAMPLE = `{
  "id": 7,
  "name": "GongJu",
  "email": "hello@gongju.dev",
  "active": true,
  "createdAt": "2026-03-01T09:30:00Z",
  "tags": ["tools", "json"],
  "profile": { "city": "Shanghai", "score": 4.5 }
}`;

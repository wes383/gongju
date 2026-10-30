/**
 * JSON helpers: parsing with error locations, structural transforms,
 * diffing, type inference and code generation.
 */

/** Neutral sample reused by the JSON tools */
export const JSON_SAMPLE = `{
  "id": 1024,
  "name": "GongJu",
  "active": true,
  "tags": ["tools", "json"],
  "owner": { "login": "dev", "email": "dev@example.com" },
  "items": [
    { "sku": "A-1", "qty": 2, "price": 9.9 },
    { "sku": "B-2", "qty": 1, "price": 19.5 }
  ]
}`;

/* ══════════════════════════════════════════════════════════════
   Parsing
   ══════════════════════════════════════════════════════════════ */

export interface JsonParseError {
  ok: false;
  message: string;
  line?: number;
  column?: number;
  position?: number;
}

export type JsonParseResult = { ok: true; value: unknown } | JsonParseError;

function locate(text: string, position: number): { line: number; column: number } {
  const before = text.slice(0, position);
  const lines = before.split("\n");
  return { line: lines.length, column: lines[lines.length - 1].length + 1 };
}

export function parseJson(text: string): JsonParseResult {
  const src = text.trim();
  if (!src) return { ok: false, message: "json.empty" };
  try {
    return { ok: true, value: JSON.parse(src) };
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    // V8 embeds the offset, and usually the line/column, in the message
    const posMatch = /position (\d+)/.exec(raw);
    const lineMatch = /line (\d+) column (\d+)/.exec(raw);
    const position = posMatch ? Number(posMatch[1]) : undefined;

    let line: number | undefined;
    let column: number | undefined;
    if (lineMatch) {
      line = Number(lineMatch[1]);
      column = Number(lineMatch[2]);
    } else if (position !== undefined) {
      const loc = locate(src, position);
      line = loc.line;
      column = loc.column;
    }

    const cleaned = raw
      .replace(/^JSON\.parse: /, "")
      .replace(/ in JSON at position \d+.*$/, "")
      .replace(/ \(line \d+ column \d+\)$/, "")
      .trim();

    return { ok: false, message: cleaned, line, column, position };
  }
}

/* ══════════════════════════════════════════════════════════════
   Structural helpers
   ══════════════════════════════════════════════════════════════ */

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (!isPlainObject(value)) return value;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort((a, b) => a.localeCompare(b))) {
    out[key] = sortKeysDeep(value[key]);
  }
  return out;
}

export function jsonDepth(value: unknown): number {
  if (Array.isArray(value)) {
    return value.length === 0 ? 1 : 1 + Math.max(...value.map(jsonDepth));
  }
  if (isPlainObject(value)) {
    const values = Object.values(value);
    return values.length === 0 ? 1 : 1 + Math.max(...values.map(jsonDepth));
  }
  return 1;
}

export function countNodes(value: unknown): number {
  if (Array.isArray(value)) return 1 + value.reduce<number>((n, v) => n + countNodes(v), 0);
  if (isPlainObject(value)) {
    return 1 + Object.values(value).reduce<number>((n, v) => n + countNodes(v), 0);
  }
  return 1;
}

/** Stable string form, used for deep equality and dedupe */
export function canonicalKey(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalKey).join(",")}]`;
  if (isPlainObject(value)) {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalKey(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export function dedupeArray(items: unknown[]): unknown[] {
  const seen = new Set<string>();
  const out: unknown[] = [];
  for (const item of items) {
    const key = canonicalKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export type ArrayMode = "keep" | "index";

export function flattenJson(
  value: unknown,
  separator = ".",
  arrayMode: ArrayMode = "keep",
  prefix = ""
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  const walk = (node: unknown, path: string) => {
    if (isPlainObject(node)) {
      const keys = Object.keys(node);
      if (keys.length === 0) {
        out[path || ""] = {};
        return;
      }
      for (const key of keys) {
        walk(node[key], path ? `${path}${separator}${key}` : key);
      }
      return;
    }
    if (Array.isArray(node) && arrayMode === "index") {
      if (node.length === 0) {
        out[path] = [];
        return;
      }
      node.forEach((item, i) => walk(item, `${path}[${i}]`));
      return;
    }
    out[path] = node;
  };

  walk(value, prefix);
  return out;
}

export function unflattenJson(flat: Record<string, unknown>, separator = "."): unknown {
  const root: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split(separator);
    let cursor: Record<string, unknown> = root;
    parts.forEach((part, i) => {
      if (i === parts.length - 1) {
        cursor[part] = value;
        return;
      }
      const next = cursor[part];
      if (!isPlainObject(next)) cursor[part] = {};
      cursor = cursor[part] as Record<string, unknown>;
    });
  }
  return root;
}

/* ══════════════════════════════════════════════════════════════
   Diff
   ══════════════════════════════════════════════════════════════ */

export type DiffKind = "added" | "removed" | "changed";

export interface DiffEntry {
  path: string;
  kind: DiffKind;
  left?: unknown;
  right?: unknown;
}

function formatPath(base: string, key: string | number): string {
  if (typeof key === "number") return `${base}[${key}]`;
  return /^[A-Za-z_$][\w$]*$/.test(key) ? `${base}.${key}` : `${base}[${JSON.stringify(key)}]`;
}

export function diffJson(left: unknown, right: unknown, base = "$"): DiffEntry[] {
  const out: DiffEntry[] = [];

  const walk = (a: unknown, b: unknown, path: string) => {
    if (a === undefined && b !== undefined) {
      out.push({ path, kind: "added", right: b });
      return;
    }
    if (a !== undefined && b === undefined) {
      out.push({ path, kind: "removed", left: a });
      return;
    }

    const aIsArr = Array.isArray(a);
    const bIsArr = Array.isArray(b);
    const aIsObj = isPlainObject(a);
    const bIsObj = isPlainObject(b);

    if (aIsArr && bIsArr) {
      const max = Math.max(a.length, b.length);
      for (let i = 0; i < max; i++) walk(a[i], b[i], formatPath(path, i));
      return;
    }
    if (aIsObj && bIsObj) {
      const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
      for (const key of keys) walk(a[key], b[key], formatPath(path, key));
      return;
    }
    if (canonicalKey(a) !== canonicalKey(b)) {
      out.push({ path, kind: "changed", left: a, right: b });
    }
  };

  walk(left, right, base);
  return out;
}

/* ══════════════════════════════════════════════════════════════
   Type inference
   ══════════════════════════════════════════════════════════════ */

export type PrimitiveKind = "string" | "number" | "boolean" | "null" | "any";

export interface ObjectField {
  type: TypeNode;
  optional: boolean;
}

export interface TypeNode {
  primitives: Set<PrimitiveKind>;
  array?: TypeNode;
  fields?: Map<string, ObjectField>;
  name?: string;
  /** Every number seen at this position was an integer */
  allInt?: boolean;
}

function emptyNode(): TypeNode {
  return { primitives: new Set() };
}

function isObjectNode(node: TypeNode): boolean {
  return node.fields !== undefined;
}

function mergeNodes(a: TypeNode, b: TypeNode): TypeNode {
  const merged: TypeNode = {
    primitives: new Set([...a.primitives, ...b.primitives]),
    allInt: (a.allInt ?? true) && (b.allInt ?? true),
  };

  if (a.array || b.array) {
    merged.array = a.array && b.array ? mergeNodes(a.array, b.array) : a.array ?? b.array;
  }
  if (a.fields || b.fields) {
    const fields = new Map<string, ObjectField>();
    const aFields = a.fields ?? new Map();
    const bFields = b.fields ?? new Map();
    const keys = new Set([...aFields.keys(), ...bFields.keys()]);
    for (const key of keys) {
      const left = aFields.get(key);
      const right = bFields.get(key);
      if (left && right) {
        fields.set(key, { type: mergeNodes(left.type, right.type), optional: false });
      } else {
        const only = (left ?? right)!;
        fields.set(key, { type: only.type, optional: true });
      }
    }
    merged.fields = fields;
  }
  return merged;
}

export function inferType(value: unknown): TypeNode {
  if (value === null) return { primitives: new Set(["null"]) };
  if (Array.isArray(value)) {
    const node: TypeNode = { primitives: new Set(), array: emptyNode() };
    if (value.length === 0) {
      node.array = { primitives: new Set(["any"]) };
      return node;
    }
    node.array = value.map(inferType).reduce(mergeNodes);
    return node;
  }
  if (isPlainObject(value)) {
    const fields = new Map<string, ObjectField>();
    for (const [key, v] of Object.entries(value)) {
      fields.set(key, { type: inferType(v), optional: false });
    }
    return { primitives: new Set(), fields };
  }
  if (typeof value === "string") return { primitives: new Set(["string"]) };
  if (typeof value === "number") {
    return { primitives: new Set(["number"]), allInt: Number.isInteger(value) };
  }
  if (typeof value === "boolean") return { primitives: new Set(["boolean"]) };
  return { primitives: new Set(["any"]) };
}

/* ══════════════════════════════════════════════════════════════
   Naming
   ══════════════════════════════════════════════════════════════ */

function pascalCase(input: string): string {
  const cleaned = input.replace(/[^A-Za-z0-9]+/g, " ").trim();
  if (!cleaned) return "Item";
  const out = cleaned
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
  return /^[0-9]/.test(out) ? `N${out}` : out;
}

function singular(word: string): string {
  if (/ies$/i.test(word)) return word.replace(/ies$/i, "y");
  if (/(ses|xes|ches|shes)$/i.test(word)) return word.replace(/es$/i, "");
  if (/s$/i.test(word) && !/ss$/i.test(word)) return word.slice(0, -1);
  return word;
}

/** Walk the type tree and give every object node a unique interface name */
function nameObjectNodes(root: TypeNode, rootName: string): TypeNode[] {
  const used = new Set<string>();
  const named: TypeNode[] = [];

  const uniqueName = (base: string): string => {
    let name = base;
    let i = 2;
    while (used.has(name)) name = `${base}${i++}`;
    used.add(name);
    return name;
  };

  const visit = (node: TypeNode, hint: string) => {
    if (node.array) visit(node.array, singular(hint));
    if (!isObjectNode(node)) return;
    node.name = uniqueName(pascalCase(hint));
    named.push(node);
    for (const [key, field] of node.fields ?? []) {
      visit(field.type, pascalCase(key));
    }
  };

  visit(root, rootName);
  return named;
}

/* ══════════════════════════════════════════════════════════════
   TypeScript
   ══════════════════════════════════════════════════════════════ */

function tsPrimitive(node: TypeNode): string {
  const parts: string[] = [];
  if (node.primitives.has("string")) parts.push("string");
  if (node.primitives.has("number")) parts.push("number");
  if (node.primitives.has("boolean")) parts.push("boolean");
  if (node.primitives.has("null")) parts.push("null");
  if (node.primitives.has("any")) parts.push("unknown");
  return parts.join(" | ");
}

function tsType(node: TypeNode, indent: number): string {
  if (node.array) {
    const inner = tsType(node.array, indent);
    return /[|&\s]/.test(inner) ? `Array<${inner}>` : `${inner}[]`;
  }
  if (isObjectNode(node)) return node.name ?? "Record<string, unknown>";
  const prim = tsPrimitive(node);
  return prim || "unknown";
}

export function toTypeScript(value: unknown, rootName = "Root"): string {
  const root = inferType(value);
  if (isObjectNode(root) || (root.array && isObjectNode(root.array))) {
    const nodes = nameObjectNodes(root, rootName);
    const blocks = nodes.map((node) => {
      const lines: string[] = [`export interface ${node.name} {`];
      for (const [key, field] of node.fields ?? []) {
        const safeKey = /^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key);
        lines.push(`  ${safeKey}${field.optional ? "?" : ""}: ${tsType(field.type, 1)};`);
      }
      lines.push("}");
      return lines.join("\n");
    });
    return blocks.reverse().join("\n\n") + "\n";
  }
  return `export type ${pascalCase(rootName)} = ${tsType(root, 0)};\n`;
}

/* ══════════════════════════════════════════════════════════════
   Go
   ══════════════════════════════════════════════════════════════ */

function goPrimitive(node: TypeNode): string {
  const p = node.primitives;
  const hasInt = p.has("number");
  if (p.size === 1 && p.has("string")) return "string";
  if (p.size === 1 && p.has("boolean")) return "bool";
  if (p.size === 1 && hasInt) return node.allInt ? "int" : "float64";
  if (p.has("null") && p.size === 1) return "interface{}";
  if (p.size === 0) return "interface{}";
  return "interface{}";
}

function goType(node: TypeNode): string {
  if (node.array) return `[]${goType(node.array)}`;
  if (isObjectNode(node)) return node.name ?? "map[string]interface{}";
  return goPrimitive(node);
}

export function toGo(value: unknown, rootName = "Root"): string {
  const root = inferType(value);
  if (!isObjectNode(root) && !(root.array && isObjectNode(root.array))) {
    return `type ${pascalCase(rootName)} ${goType(root)}\n`;
  }
  const nodes = nameObjectNodes(root, rootName);
  const blocks = nodes.map((node) => {
    const lines: string[] = [`type ${node.name} struct {`];
    const rows = [...(node.fields ?? [])].map(([key, field]) => ({
      key,
      name: pascalCase(key),
      type: goType(field.type),
      optional: field.optional,
    }));
    const nameWidth = Math.max(0, ...rows.map((r) => r.name.length));
    const typeWidth = Math.max(0, ...rows.map((r) => r.type.length));
    for (const row of rows) {
      const tag = `json:"${row.key}${row.optional ? ",omitempty" : ""}"`;
      lines.push(`\t${row.name.padEnd(nameWidth)} ${row.type.padEnd(typeWidth)} \`${tag}\``);
    }
    lines.push("}");
    return lines.join("\n");
  });
  return blocks.reverse().join("\n\n") + "\n";
}

/* ══════════════════════════════════════════════════════════════
   Python
   ══════════════════════════════════════════════════════════════ */

function pyPrimitive(node: TypeNode): string {
  const parts: string[] = [];
  if (node.primitives.has("string")) parts.push("str");
  if (node.primitives.has("number")) parts.push(node.allInt ? "int" : "float");
  if (node.primitives.has("boolean")) parts.push("bool");
  if (node.primitives.has("null")) parts.push("None");
  if (parts.length === 0) parts.push("Any");
  return parts.join(" | ");
}

function pyType(node: TypeNode): string {
  if (node.array) return `list[${pyType(node.array)}]`;
  if (isObjectNode(node)) return node.name ?? "dict[str, Any]";
  return pyPrimitive(node);
}

export function toPython(value: unknown, rootName = "Root"): string {
  const root = inferType(value);

  if (!isObjectNode(root) && !(root.array && isObjectNode(root.array))) {
    const expr = pyType(root);
    const header = expr.includes("Any") ? "from typing import Any\n\n" : "";
    return `${header}${pascalCase(rootName)} = ${expr}\n`;
  }

  const nodes = nameObjectNodes(root, rootName);
  const blocks = nodes.map((node) => {
    const lines: string[] = [`class ${node.name}(TypedDict, total=False):`];
    const fields = [...(node.fields ?? [])];
    if (fields.length === 0) {
      lines.push("    pass");
    }
    for (const [key, field] of fields) {
      const safeKey = /^[A-Za-z_]\w*$/.test(key) ? key : `"${key}"`;
      lines.push(`    ${safeKey}: ${pyType(field.type)}`);
    }
    return lines.join("\n");
  });

  const body = blocks.reverse().join("\n\n");
  const imports = body.includes("Any")
    ? "from typing import Any, TypedDict\n\n"
    : "from typing import TypedDict\n\n";
  return `${imports}${body}\n`;
}

/* ══════════════════════════════════════════════════════════════
   Java
   ══════════════════════════════════════════════════════════════ */

function javaPrimitive(node: TypeNode): string {
  const p = node.primitives;
  if (p.size === 1 && p.has("string")) return "String";
  if (p.size === 1 && p.has("boolean")) return "Boolean";
  if (p.size === 1 && p.has("number")) return node.allInt ? "Long" : "Double";
  return "Object";
}

function javaType(node: TypeNode): string {
  if (node.array) return `List<${javaType(node.array)}>`;
  if (isObjectNode(node)) return node.name ?? "Map<String, Object>";
  return javaPrimitive(node);
}

export function toJava(value: unknown, rootName = "Root"): string {
  const root = inferType(value);

  if (!isObjectNode(root) && !(root.array && isObjectNode(root.array))) {
    return `public class ${pascalCase(rootName)} {\n    private ${javaType(root)} value;\n}\n`;
  }

  const nodes = nameObjectNodes(root, rootName);
  const blocks = nodes.map((node) => {
    const lines: string[] = [`public class ${node.name} {`];
    for (const [key, field] of node.fields ?? []) {
      const fieldName = key.replace(/[^A-Za-z0-9_]/g, "_");
      lines.push(`    private ${javaType(field.type)} ${fieldName};`);
    }
    lines.push("}");
    return lines.join("\n");
  });

  const body = blocks.reverse().join("\n\n");
  const imports = body.includes("List<") ? "import java.util.List;\n\n" : "";
  return `${imports}${body}\n`;
}

/* ══════════════════════════════════════════════════════════════
   CSV
   ══════════════════════════════════════════════════════════════ */

export interface TabularData {
  columns: string[];
  rows: Record<string, unknown>[];
}

export function toTabular(value: unknown, flatten: boolean, separator = "."): TabularData {
  const list = Array.isArray(value) ? value : [value];
  const rows: Record<string, unknown>[] = [];
  const columns = new Set<string>();

  for (const item of list) {
    if (isPlainObject(item)) {
      const row = flatten ? flattenJson(item, separator, "keep") : (item as Record<string, unknown>);
      rows.push(row);
      Object.keys(row).forEach((k) => columns.add(k));
    } else if (Array.isArray(item)) {
      const row: Record<string, unknown> = {};
      item.forEach((v, i) => {
        row[`[${i}]`] = v;
        columns.add(`[${i}]`);
      });
      rows.push(row);
    } else {
      rows.push({ value: item });
      columns.add("value");
    }
  }

  return { columns: [...columns], rows };
}

export function cellToString(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

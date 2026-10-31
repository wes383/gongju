/**
 * Mock data generation from a JSON Schema (draft-07 subset): objects, arrays,
 * primitives, enums, formats and simple $ref lookups. Deterministic per seed.
 */

import type { JsonSchema } from "@/lib/json-schema";

export type MockLocale = "zh" | "en";

interface Rng {
  (): number;
}

/** Small deterministic PRNG so the same seed always yields the same output */
function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WORDS: Record<MockLocale, string[]> = {
  zh: ["工具", "数据", "设计", "接口", "文档", "流程", "系统", "模板", "测试", "分析"],
  en: ["tool", "data", "design", "api", "document", "flow", "system", "template", "test", "analysis"],
};

const FIRST_ZH = ["小明", "小红", "伟", "芳", "娜", "磊", "静", "洋", "敏", "强"];
const LAST_ZH = ["王", "李", "张", "刘", "陈", "杨", "赵", "黄", "周", "吴"];
const FIRST_EN = ["Alice", "Bob", "Carol", "David", "Eva", "Frank", "Grace", "Henry"];
const LAST_EN = ["Chen", "Li", "Wang", "Smith", "Brown", "Taylor", "Zhou", "Liu"];

const CITY_ZH = ["上海", "北京", "深圳", "杭州", "成都", "广州", "南京", "武汉"];
const CITY_EN = ["Shanghai", "Beijing", "Shenzhen", "Hangzhou", "Chengdu", "Guangzhou"];
const COMPANY_ZH = ["云图", "远山", "海川", "星河", "青禾", "长风"];
const COMPANY_EN = ["Northwind", "Acme", "Globex", "Initech", "Umbrella", "Hooli"];
const DOMAINS = ["example.com", "gongju.dev", "test.io", "mail.example"];
const TAGS = ["tools", "json", "web", "design", "api", "data", "demo", "sample"];

function pick<T>(rng: Rng, list: T[]): T {
  return list[Math.floor(rng() * list.length) % list.length];
}

function intBetween(rng: Rng, min: number, max: number): number {
  const lo = Math.ceil(min);
  const hi = Math.floor(max);
  if (hi <= lo) return lo;
  return lo + Math.floor(rng() * (hi - lo + 1));
}

function pad(value: number, size = 2): string {
  return String(value).padStart(size, "0");
}

function randomDate(rng: Rng, iso: boolean): string {
  const year = intBetween(rng, 2021, 2026);
  const month = intBetween(rng, 1, 12);
  const day = intBetween(rng, 1, 28);
  const base = `${year}-${pad(month)}-${pad(day)}`;
  if (!iso) return base;
  return `${base}T${pad(intBetween(rng, 0, 23))}:${pad(intBetween(rng, 0, 59))}:${pad(
    intBetween(rng, 0, 59)
  )}Z`;
}

function uuid(rng: Rng): string {
  const hex = "0123456789abcdef";
  const part = (len: number) =>
    Array.from({ length: len }, () => hex[Math.floor(rng() * 16)]).join("");
  return `${part(8)}-${part(4)}-4${part(3)}-a${part(3)}-${part(12)}`;
}

function words(rng: Rng, locale: MockLocale, count: number): string {
  const pool = WORDS[locale];
  return Array.from({ length: count }, () => pick(rng, pool)).join(locale === "zh" ? "" : " ");
}

function personName(rng: Rng, locale: MockLocale): string {
  if (locale === "zh") return `${pick(rng, LAST_ZH)}${pick(rng, FIRST_ZH)}`;
  return `${pick(rng, FIRST_EN)} ${pick(rng, LAST_EN)}`;
}

function emailFor(rng: Rng, name: string | null): string {
  const local = name
    ? name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "") || "user"
    : `user${intBetween(rng, 1, 999)}`;
  return `${local}@${pick(rng, DOMAINS)}`;
}

function byKey(key: string, rng: Rng, locale: MockLocale): unknown | undefined {
  const k = key.toLowerCase();
  if (/e-?mail/.test(k)) return emailFor(rng, null);
  if (/(^|_)(name|fullname|username)$/.test(k) || k === "name") {
    return personName(rng, locale);
  }
  if (/(phone|mobile|tel)/.test(k)) {
    return locale === "zh"
      ? `1${intBetween(rng, 3, 9)}${Array.from({ length: 9 }, () => intBetween(rng, 0, 9)).join("")}`
      : `+1-${intBetween(rng, 200, 999)}-${intBetween(rng, 200, 999)}-${intBetween(rng, 1000, 9999)}`;
  }
  if (/(city|地址|城市)/.test(k)) return locale === "zh" ? pick(rng, CITY_ZH) : pick(rng, CITY_EN);
  if (/(company|org|employer)/.test(k)) {
    return locale === "zh"
      ? `${pick(rng, COMPANY_ZH)}${pick(rng, ["科技", "网络", "信息"])}`
      : `${pick(rng, COMPANY_EN)} Inc.`;
  }
  if (/(url|link|website|avatar|image|photo|cover)/.test(k)) {
    return `https://picsum.photos/seed/${intBetween(rng, 1, 999)}/400/300`;
  }
  if (/(uuid|guid)/.test(k)) return uuid(rng);
  if (/(date|time|created|updated|birthday)/.test(k)) return randomDate(rng, true);
  if (/(price|amount|total|cost|salary|score|rating)/.test(k)) {
    return Number((rng() * 1000).toFixed(2));
  }
  if (/(^|_)id$/.test(k) || k === "id") return intBetween(rng, 1, 9999);
  if (/(description|summary|bio|content|note|comment|message)/.test(k)) {
    return words(rng, locale, 6);
  }
  if (/(tag|label|category|status|type)/.test(k)) return pick(rng, TAGS);
  return undefined;
}

function resolveRef(schema: JsonSchema, root: JsonSchema): JsonSchema | null {
  const ref = schema.$ref;
  if (typeof ref !== "string" || !ref.startsWith("#/")) return null;
  const path = ref.slice(2).split("/");
  let node: unknown = root;
  for (const segment of path) {
    if (typeof node !== "object" || node === null) return null;
    node = (node as Record<string, unknown>)[segment];
  }
  return typeof node === "object" && node !== null ? (node as JsonSchema) : null;
}

function stringValue(schema: JsonSchema, key: string, rng: Rng, locale: MockLocale): string {
  const format = typeof schema.format === "string" ? schema.format : null;
  switch (format) {
    case "email":
      return emailFor(rng, personName(rng, locale));
    case "uri":
    case "url":
      return `https://example.com/${words(rng, locale, 2).replace(/\s/g, "-")}`;
    case "date":
      return randomDate(rng, false);
    case "date-time":
      return randomDate(rng, true);
    case "uuid":
      return uuid(rng);
    case "ipv4":
      return `${intBetween(rng, 1, 223)}.${intBetween(rng, 0, 255)}.${intBetween(
        rng,
        0,
        255
      )}.${intBetween(rng, 1, 254)}`;
    default:
      break;
  }

  const enumValues = Array.isArray(schema.enum) ? schema.enum : null;
  if (enumValues && enumValues.length > 0) {
    return String(pick(rng, enumValues));
  }

  const fromKey = byKey(key, rng, locale);
  if (typeof fromKey === "string") return fromKey;

  const min = typeof schema.minLength === "number" ? schema.minLength : 0;
  let value = words(rng, locale, 3);
  while (value.length < min) value += words(rng, locale, 1);
  const max = typeof schema.maxLength === "number" ? schema.maxLength : Infinity;
  return value.slice(0, max);
}

function numberValue(schema: JsonSchema, key: string, rng: Rng): number {
  const min = typeof schema.minimum === "number" ? schema.minimum : undefined;
  const max = typeof schema.maximum === "number" ? schema.maximum : undefined;
  const integer = schema.type === "integer";
  const fromKey = byKey(key, rng, "en");

  let value: number;
  if (min !== undefined && max !== undefined) {
    value = integer ? intBetween(rng, min, max) : min + rng() * (max - min);
  } else if (integer) {
    value = typeof fromKey === "number" ? fromKey : intBetween(rng, 1, 1000);
  } else if (typeof fromKey === "number") {
    value = fromKey;
  } else {
    value = Number((rng() * 100).toFixed(2));
  }

  if (typeof schema.multipleOf === "number" && schema.multipleOf > 0) {
    value = Math.round(value / schema.multipleOf) * schema.multipleOf;
  }
  return integer ? Math.round(value) : Number(value.toFixed(2));
}

function valueFor(
  schema: JsonSchema,
  root: JsonSchema,
  key: string,
  rng: Rng,
  locale: MockLocale,
  depth: number
): unknown {
  if (depth > 8) return null;

  const ref = resolveRef(schema, root);
  if (ref) return valueFor(ref, root, key, rng, locale, depth + 1);

  // Pick the first branch of a combinator so output stays predictable
  for (const combinator of ["oneOf", "anyOf", "allOf"] as const) {
    const branches = schema[combinator];
    if (Array.isArray(branches) && branches.length > 0) {
      if (combinator === "allOf") {
        const merged = branches.reduce<JsonSchema>(
          (acc, next) => ({ ...acc, ...(next as JsonSchema) }),
          {}
        );
        return valueFor(merged, root, key, rng, locale, depth + 1);
      }
      return valueFor(branches[0] as JsonSchema, root, key, rng, locale, depth + 1);
    }
  }

  const constValue = schema.const;
  if (constValue !== undefined) return constValue;

  const declared = schema.type;
  const types = Array.isArray(declared) ? declared.map(String) : [String(declared ?? "")];
  const type = types.find((item) => item !== "null") ?? types[0] ?? "";

  switch (type) {
    case "object":
      return objectValue(schema, root, rng, locale, depth);
    case "array": {
      const items = (schema.items as JsonSchema | undefined) ?? {};
      const min = typeof schema.minItems === "number" ? schema.minItems : 1;
      const max = typeof schema.maxItems === "number" ? schema.maxItems : Math.max(min, 3);
      const length = intBetween(rng, min, Math.min(max, 5));
      return Array.from({ length }, () => valueFor(items, root, key, rng, locale, depth + 1));
    }
    case "string":
      return stringValue(schema, key, rng, locale);
    case "integer":
      return numberValue({ ...schema, type: "integer" }, key, rng);
    case "number":
      return numberValue(schema, key, rng);
    case "boolean":
      return rng() > 0.5;
    case "null":
      return null;
    default:
      return null;
  }
}

function objectValue(
  schema: JsonSchema,
  root: JsonSchema,
  rng: Rng,
  locale: MockLocale,
  depth: number
): Record<string, unknown> {
  const properties = (schema.properties as Record<string, JsonSchema>) ?? {};
  const required = new Set((schema.required as string[]) ?? []);
  const output: Record<string, unknown> = {};

  for (const [key, child] of Object.entries(properties)) {
    // Keep optional fields only half the time so rows look varied
    if (!required.has(key) && rng() < 0.35) continue;
    output[key] = valueFor(child ?? {}, root, key, rng, locale, depth + 1);
  }

  // Every key listed as required must exist even without a property schema
  for (const key of required) {
    if (!(key in output)) output[key] = valueFor({}, root, key, rng, locale, depth + 1);
  }
  return output;
}

export interface MockOptions {
  count?: number;
  seed?: number;
  locale?: MockLocale;
}

/** Generate `count` documents matching the schema */
export function generateMock(schema: JsonSchema, options: MockOptions = {}): unknown[] {
  const count = Math.max(1, Math.min(options.count ?? 5, 200));
  const seed = options.seed ?? Date.now();
  const locale = options.locale ?? "en";
  const rng = mulberry32(seed);
  return Array.from({ length: count }, () =>
    valueFor(schema, schema, "", rng, locale, 0)
  );
}

export function mockJson(schema: JsonSchema, options: MockOptions = {}): string {
  return JSON.stringify(generateMock(schema, options), null, 2);
}

export const MOCK_SAMPLE_SCHEMA = `{
  "type": "object",
  "properties": {
    "id": { "type": "integer", "minimum": 1, "maximum": 9999 },
    "name": { "type": "string" },
    "email": { "type": "string", "format": "email" },
    "age": { "type": "integer", "minimum": 18, "maximum": 65 },
    "city": { "type": "string" },
    "active": { "type": "boolean" },
    "createdAt": { "type": "string", "format": "date-time" },
    "tags": { "type": "array", "items": { "type": "string" } }
  },
  "required": ["id", "name", "email", "active"]
}`;

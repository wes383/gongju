import { describe, expect, it } from "vitest";
import {
  countNodes,
  dedupeArray,
  diffJson,
  flattenJson,
  jsonDepth,
  parseJson,
  sortKeysDeep,
  unflattenJson,
} from "@/lib/json";

describe("parseJson", () => {
  it("parses valid input", () => {
    const result = parseJson('{"a":1}');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual({ a: 1 });
  });

  it("reports the position of a syntax error", () => {
    const result = parseJson('{\n  "a": 1,\n}');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.line).toBeGreaterThan(0);
      expect(result.column).toBeGreaterThan(0);
      expect(result.message).not.toMatch(/^JSON\.parse: /);
    }
  });

  it("treats blank input as empty", () => {
    const result = parseJson("   ");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toBe("json.empty");
  });
});

describe("sortKeysDeep", () => {
  it("sorts object keys at every level", () => {
    const sorted = sortKeysDeep({ b: 1, a: { d: 2, c: 3 } });
    expect(JSON.stringify(sorted)).toBe('{"a":{"c":3,"d":2},"b":1}');
  });

  it("leaves arrays in order", () => {
    expect(sortKeysDeep([3, 1, 2])).toEqual([3, 1, 2]);
  });
});

describe("structure helpers", () => {
  it("measures depth", () => {
    expect(jsonDepth({ a: { b: { c: 1 } } })).toBe(4);
    expect(jsonDepth(1)).toBe(1);
  });

  it("counts nodes", () => {
    expect(countNodes({ a: 1, b: [2, 3] })).toBe(5);
  });
});

describe("flatten / unflatten", () => {
  it("round-trips a nested object", () => {
    const source = { a: { b: 1, c: { d: 2 } }, e: 3 };
    const flat = flattenJson(source);
    expect(flat["a.b"]).toBe(1);
    expect(unflattenJson(flat)).toEqual(source);
  });
});

describe("dedupeArray", () => {
  it("removes structural duplicates but keeps distinct values", () => {
    const result = dedupeArray([1, 1, "1", { a: 1 }, { a: 1 }, null, null]);
    expect(result).toHaveLength(4);
  });
});

describe("diffJson", () => {
  it("reports changed, added and removed keys", () => {
    const entries = diffJson({ a: 1, b: 2 }, { a: 2, c: 3 });
    const paths = entries.map((entry) => entry.path);
    expect(paths).toContain("$.a");
    expect(paths).toContain("$.b");
    expect(paths).toContain("$.c");
  });

  it("returns nothing for identical documents", () => {
    expect(diffJson({ a: [1, 2] }, { a: [1, 2] })).toHaveLength(0);
  });
});

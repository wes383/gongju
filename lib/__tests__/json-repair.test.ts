import { describe, expect, it } from "vitest";
import { repairJson } from "@/lib/json-repair";

describe("repairJson", () => {
  it("leaves valid JSON untouched", () => {
    const result = repairJson('{"a":1,"b":[true,null]}');
    expect(result.error).toBeNull();
    expect(result.repairs).toEqual([]);
    expect(result.value).toEqual({ a: 1, b: [true, null] });
  });

  it("drops a trailing comma", () => {
    const result = repairJson('{"a":1,}');
    expect(result.value).toEqual({ a: 1 });
    expect(result.repairs).toContain("trailing-comma");
  });

  it("strips comments", () => {
    const result = repairJson(`{
      // the answer
      "a": 42 /* inline */
    }`);
    expect(result.value).toEqual({ a: 42 });
    expect(result.repairs).toContain("comment");
  });

  it("accepts single quotes and unquoted keys", () => {
    const result = repairJson("{name: 'Alice', age: 30}");
    expect(result.value).toEqual({ name: "Alice", age: 30 });
    expect(result.repairs).toContain("single-quote");
    expect(result.repairs).toContain("unquoted-key");
  });

  it("inserts missing commas", () => {
    const result = repairJson('{"a":1 "b":2}');
    expect(result.value).toEqual({ a: 1, b: 2 });
    expect(result.repairs).toContain("missing-comma");
  });

  it("closes an unclosed array", () => {
    const result = repairJson('{"a":[1,2');
    expect(result.value).toEqual({ a: [1, 2] });
    expect(result.repairs).toContain("unclosed");
  });

  it("maps Python literals", () => {
    const result = repairJson('{"ok": True, "none": None, "no": False}');
    expect(result.value).toEqual({ ok: true, none: null, no: false });
    expect(result.repairs).toContain("python-literal");
  });

  it("strips a BOM", () => {
    const result = repairJson('\uFEFF{"a":1}');
    expect(result.repairs).toContain("bom");
    expect(result.value).toEqual({ a: 1 });
  });

  it("normalises full-width punctuation", () => {
    const result = repairJson('｛"a"：1｝');
    expect(result.value).toEqual({ a: 1 });
    expect(result.repairs).toContain("full-width");
  });

  it("reports the position when nothing can be recovered", () => {
    const result = repairJson('{\n  "a": ,\n}');
    expect(result.value).toBeNull();
    expect(result.error?.line).toBe(2);
    expect(result.error?.column).toBe(8);
  });

  it("rejects empty input", () => {
    expect(repairJson("   ").error?.message).toBe("json.empty");
  });
});

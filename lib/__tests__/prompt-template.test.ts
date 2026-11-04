import { describe, expect, it } from "vitest";
import {
  collectVariables,
  parseBatch,
  parseTemplate,
  renderBatch,
  renderTemplate,
  serializeBatch,
  tidyPrompt,
  unresolvedVariables,
} from "@/lib/prompt-template";

const TEMPLATE = "Translate {{text}} into {{ target }}. Keep the tone.";

describe("template parsing", () => {
  it("finds variables in order with their repeat count", () => {
    expect(collectVariables(TEMPLATE)).toEqual([
      { name: "text", count: 1 },
      { name: "target", count: 1 },
    ]);
    expect(collectVariables("{{a}} {{b}} {{a}}")).toEqual([
      { name: "a", count: 2 },
      { name: "b", count: 1 },
    ]);
  });

  it("keeps text between placeholders", () => {
    const parts = parseTemplate("Hi {{name}}!");
    expect(parts.map((part) => part.text)).toEqual(["Hi ", "{{name}}", "!"]);
  });

  it("leaves a placeholder with an unusable name as literal text", () => {
    const parts = parseTemplate("{{ not a name }} {{ok}}");
    expect(parts.filter((part) => part.kind === "var")).toHaveLength(1);
    expect(renderTemplate("{{ not a name }}", {})).toBe("{{ not a name }}");
  });

  it("rejects an unclosed placeholder", () => {
    expect(() => parseTemplate("Hello {{name")).toThrow();
  });
});

describe("rendering", () => {
  it("substitutes every occurrence", () => {
    expect(renderTemplate("{{a}}-{{a}}", { a: "x" })).toBe("x-x");
  });

  it("keeps or blanks a missing variable depending on the policy", () => {
    expect(renderTemplate("Hi {{name}}", {})).toBe("Hi {{name}}");
    expect(renderTemplate("Hi {{name}}", {}, { missing: "blank" })).toBe("Hi ");
    expect(renderTemplate("Hi {{name}}", { name: "" })).toBe("Hi ");
  });

  it("lists the variables a row does not provide", () => {
    expect(unresolvedVariables(TEMPLATE, { text: "hi" })).toEqual(["target"]);
  });

  it("tidies trailing spaces and runs of blank lines", () => {
    expect(tidyPrompt("a  \n\n\n\nb  ")).toBe("a\n\nb");
  });
});

describe("batch input", () => {
  it("reads a CSV with a header row", () => {
    const batch = parseBatch("name,city\nAda,London\nLinus,Helsinki");
    expect(batch.format).toBe("csv");
    expect(batch.rows).toEqual([
      { name: "Ada", city: "London" },
      { name: "Linus", city: "Helsinki" },
    ]);
  });

  it("reads a JSON array and stringifies nested values", () => {
    const batch = parseBatch('[{"q":"hi","tags":["a","b"]}]');
    expect(batch.format).toBe("json");
    expect(batch.rows[0].tags).toBe('["a","b"]');
  });

  it("reads JSON Lines", () => {
    const batch = parseBatch('{"q":"one"}\n{"q":"two"}');
    expect(batch.format).toBe("jsonl");
    expect(batch.rows.map((row) => row.q)).toEqual(["one", "two"]);
  });

  it("rejects empty or unrecognisable input", () => {
    expect(() => parseBatch("   ")).toThrow();
    expect(() => parseBatch("just one column of prose")).toThrow();
  });
});

describe("batch rendering", () => {
  const rows: Record<string, string>[] = [
    { text: "hello", target: "French" },
    { text: "bye" },
  ];

  it("renders every row and reports missing variables", () => {
    const result = renderBatch(TEMPLATE, rows);
    expect(result.outputs[0]).toBe("Translate hello into French. Keep the tone.");
    expect(result.outputs[1]).toContain("{{ target }}");
    expect(result.missing).toEqual(["target"]);
  });

  it("serialises to JSONL, JSON, CSV and text", () => {
    const outputs = renderBatch(TEMPLATE, rows).outputs;

    const jsonl = serializeBatch(rows, outputs, "jsonl");
    expect(jsonl.split("\n")).toHaveLength(2);
    expect(JSON.parse(jsonl.split("\n")[0]).output).toContain("hello");

    expect(JSON.parse(serializeBatch(rows, outputs, "json"))[1].output).toContain("bye");

    const csv = serializeBatch(rows, outputs, "csv");
    expect(csv.split("\r\n")[0]).toContain("output");
    expect(csv).toContain("Translate");

    expect(serializeBatch(rows, outputs, "text").split("---")).toHaveLength(2);
  });
});

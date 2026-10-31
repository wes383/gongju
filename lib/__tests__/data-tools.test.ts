import { describe, expect, it } from "vitest";

import {
  addRow,
  columnStats,
  parseCsv,
  removeRow,
  setCell,
  sniffDelimiter,
  stringifyCsv,
  tableToMarkdown,
} from "@/lib/csv";
import { parseCurl, toCode, tokenize } from "@/lib/curl";
import { buildGitignore, DEFAULT_IGNORE } from "@/lib/gitignore";
import { buildIco, readIcoDirectory } from "@/lib/ico";
import { inferSchema, schemaFromSample, validateJson } from "@/lib/json-schema";
import { generateMock } from "@/lib/mock";
import { buildCreateTable, buildInserts, buildSql } from "@/lib/sql";
import { optimizeSvg, svgSize } from "@/lib/svg";

describe("csv", () => {
  const text = "id,name,score\n1,Alice,9.5\n2,Bob,\n3,Carol,7";

  it("parses a header and pads short rows", () => {
    const table = parseCsv(text)!;
    expect(table.header).toEqual(["id", "name", "score"]);
    expect(table.rows).toHaveLength(3);
    expect(table.rows[0]).toEqual(["1", "Alice", "9.5"]);
    expect(table.rows[2]).toEqual(["3", "Carol", "7"]);
  });

  it("detects tab and semicolon files", () => {
    expect(sniffDelimiter("a\tb\tc")).toBe("\t");
    expect(sniffDelimiter("a;b;c")).toBe(";");
    expect(sniffDelimiter("a,b,c")).toBe(",");
    const tabbed = parseCsv("x\ty\n1\t2")!;
    expect(tabbed.header).toEqual(["x", "y"]);
    expect(tabbed.delimiter).toBe("\t");
  });

  it("returns null for empty input", () => {
    expect(parseCsv("   ")).toBeNull();
  });

  it("infers column kinds and counts empty cells", () => {
    const stats = columnStats(parseCsv(text)!);
    expect(stats[0].kind).toBe("number");
    expect(stats[2].kind).toBe("number");
    expect(stats[2].empty).toBe(1);
  });

  it("round-trips through stringify", () => {
    const table = parseCsv(text)!;
    const again = parseCsv(stringifyCsv(table))!;
    expect(again.rows).toEqual(table.rows);
  });

  it("edits cells, adds and removes rows", () => {
    const table = parseCsv(text)!;
    expect(setCell(table, 0, 1, "Alicia").rows[0][1]).toBe("Alicia");
    const withRow = addRow(table);
    expect(withRow.rows).toHaveLength(4);
    expect(removeRow(withRow, 0).rows[0][0]).toBe("2");
  });

  it("renders a markdown table", () => {
    const markdown = tableToMarkdown(parseCsv(text)!);
    expect(markdown.split("\n")[0]).toBe("| id | name | score |");
    expect(markdown.split("\n")[1]).toBe("| --- | --- | --- |");
  });
});

describe("json schema", () => {
  const sample = {
    id: 7,
    name: "GongJu",
    email: "hello@gongju.dev",
    active: true,
    createdAt: "2026-03-01T09:30:00Z",
    tags: ["a", "b"],
    profile: { city: "Shanghai", score: 4.5 },
  };

  it("infers object, array and primitive types", () => {
    const schema = inferSchema(sample) as Record<string, unknown>;
    expect(schema.type).toBe("object");
    const properties = schema.properties as Record<string, Record<string, unknown>>;
    expect(properties.id.type).toBe("integer");
    expect(properties.active.type).toBe("boolean");
    expect(properties.tags.type).toBe("array");
    expect(properties.profile.type).toBe("object");
    expect(schema.required).toEqual(Object.keys(sample));
  });

  it("detects common string formats", () => {
    const schema = inferSchema(sample) as {
      properties: Record<string, Record<string, unknown>>;
    };
    expect(schema.properties.email.format).toBe("email");
    expect(schema.properties.createdAt.format).toBe("date-time");
  });

  it("merges heterogeneous array items", () => {
    const schema = inferSchema({ list: [1, "two"] }) as {
      properties: { list: { items: { type: unknown } } };
    };
    expect(schema.properties.list.items.type).toEqual(["integer", "string"]);
  });

  it("produces parseable JSON", () => {
    expect(() => JSON.parse(schemaFromSample(sample))).not.toThrow();
  });

  it("validates with ajv and reports the failing path", async () => {
    const schema = schemaFromSample(sample);
    const ok = await validateJson(schema, JSON.stringify(sample));
    expect(ok.ok).toBe(true);

    const bad = await validateJson(schema, JSON.stringify({ ...sample, id: "not-a-number" }));
    expect(bad.ok).toBe(false);
    if (!bad.ok && bad.kind === "invalid") {
      expect(bad.issues.some((issue) => issue.keyword === "type")).toBe(true);
      expect(bad.issues.some((issue) => issue.path === "id")).toBe(true);
    }
  });

  it("reports a broken schema separately from broken data", async () => {
    const brokenSchema = await validateJson("{oops", "{}");
    expect(brokenSchema.ok).toBe(false);
    if (!brokenSchema.ok) expect(brokenSchema.kind).toBe("schema");

    const brokenData = await validateJson('{"type":"object"}', "{oops");
    expect(brokenData.ok).toBe(false);
    if (!brokenData.ok) expect(brokenData.kind).toBe("data");
  });
});

describe("mock data", () => {
  const schema = {
    type: "object",
    properties: {
      id: { type: "integer", minimum: 10, maximum: 20 },
      email: { type: "string", format: "email" },
      name: { type: "string" },
      active: { type: "boolean" },
      tags: { type: "array", items: { type: "string" } },
    },
    required: ["id", "email", "active"],
  } as const;

  it("generates the requested number of documents", () => {
    const rows = generateMock(schema as unknown as Record<string, unknown>, { count: 7, seed: 1 });
    expect(rows).toHaveLength(7);
  });

  it("keeps required keys and respects numeric bounds", () => {
    const rows = generateMock(schema as unknown as Record<string, unknown>, {
      count: 20,
      seed: 42,
    }) as Record<string, unknown>[];
    for (const row of rows) {
      expect(typeof row.id).toBe("number");
      expect(row.id as number).toBeGreaterThanOrEqual(10);
      expect(row.id as number).toBeLessThanOrEqual(20);
      expect(typeof row.email).toBe("string");
      expect(String(row.email)).toContain("@");
      expect(typeof row.active).toBe("boolean");
    }
  });

  it("is deterministic for the same seed", () => {
    const a = generateMock(schema as unknown as Record<string, unknown>, { count: 3, seed: 9 });
    const b = generateMock(schema as unknown as Record<string, unknown>, { count: 3, seed: 9 });
    expect(a).toEqual(b);
  });

  it("handles enums and null types", () => {
    const rows = generateMock(
      {
        type: "object",
        properties: {
          status: { type: "string", enum: ["new", "done"] },
          note: { type: "null" },
        },
        required: ["status", "note"],
      },
      { count: 5, seed: 3 }
    ) as Record<string, unknown>[];
    for (const row of rows) {
      expect(["new", "done"]).toContain(row.status);
      expect(row.note).toBeNull();
    }
  });
});

describe("sql generation", () => {
  const table = parseCsv("id,name,price,active\n1,O'Neil,9.5,true\n2,Ann,,false")!;

  it("infers column types for postgres", () => {
    const ddl = buildCreateTable(table, {
      table: "users",
      dialect: "postgres",
      includeCreate: true,
      batchSize: 1,
    });
    expect(ddl).toContain('CREATE TABLE "users"');
    expect(ddl).toContain('"id" integer');
    expect(ddl).toContain('"price" double precision');
    expect(ddl).toContain('"active" boolean');
  });

  it("quotes identifiers per dialect", () => {
    const ddl = buildCreateTable(table, {
      table: "users",
      dialect: "mysql",
      includeCreate: true,
      batchSize: 1,
    });
    expect(ddl).toContain("CREATE TABLE `users`");
  });

  it("escapes quotes and writes NULL for empty cells", () => {
    const inserts = buildInserts(table, {
      table: "users",
      dialect: "sqlite",
      includeCreate: false,
      batchSize: 1,
    });
    expect(inserts).toContain("'O''Neil'");
    expect(inserts).toContain("NULL");
    expect(inserts.split("INSERT INTO").length - 1).toBe(2);
  });

  it("batches rows into one statement", () => {
    const inserts = buildInserts(table, {
      table: "users",
      dialect: "mysql",
      includeCreate: false,
      batchSize: 10,
    });
    expect(inserts.split("INSERT INTO").length - 1).toBe(1);
  });

  it("can skip the DDL", () => {
    const sql = buildSql(table, {
      table: "users",
      dialect: "mysql",
      includeCreate: false,
      batchSize: 5,
    });
    expect(sql.startsWith("INSERT INTO")).toBe(true);
  });
});

describe("curl", () => {
  const command = `curl -X POST "https://api.example.com/v1/users" \\
  -H "Content-Type: application/json" \\
  -H 'Authorization: Bearer sk-demo' \\
  -d '{"name":"Alice","age":29}'`;

  it("tokenizes quotes and line continuations", () => {
    const tokens = tokenize(`curl -H "a b: c" -d '{"x":1}'`);
    expect(tokens).toEqual(["curl", "-H", "a b: c", "-d", '{"x":1}']);
  });

  it("parses method, headers and body", () => {
    const parsed = parseCurl(command);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.request.method).toBe("POST");
    expect(parsed.request.url).toBe("https://api.example.com/v1/users");
    expect(parsed.request.headers).toEqual([
      { name: "Content-Type", value: "application/json" },
      { name: "Authorization", value: "Bearer sk-demo" },
    ]);
    expect(parsed.request.body).toBe('{"name":"Alice","age":29}');
  });

  it("infers POST when a body is present", () => {
    const parsed = parseCurl(`curl https://a.test -d 'a=1'`);
    expect(parsed.ok && parsed.request.method).toBe("POST");
  });

  it("rejects commands that are not curl", () => {
    const parsed = parseCurl("wget https://example.com");
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.message).toBe("notCurl");
  });

  it("generates code for every target", () => {
    const parsed = parseCurl(command);
    if (!parsed.ok) throw new Error("parse failed");

    const fetchCode = toCode(parsed.request, "fetch");
    expect(fetchCode).toContain('method: "POST"');
    expect(fetchCode).toContain("JSON.stringify(");
    expect(fetchCode).toContain("api.example.com");

    const axiosCode = toCode(parsed.request, "axios");
    expect(axiosCode).toContain("axios.post(");

    const python = toCode(parsed.request, "python");
    expect(python).toContain("requests.post(");
    expect(python).toContain('"""');

    const go = toCode(parsed.request, "go");
    expect(go).toContain("http.NewRequest");
    expect(go).toContain("strings.NewReader");
  });

  it("turns basic auth into an Authorization header", () => {
    const parsed = parseCurl("curl -u user:pass https://a.test");
    if (!parsed.ok) throw new Error("parse failed");
    const code = toCode(parsed.request, "fetch");
    expect(code).toContain("Basic dXNlcjpwYXNz");
  });
});

describe("gitignore", () => {
  it("merges groups and keeps a single copy of shared rules", () => {
    const output = buildGitignore(["node", "next", "logs"], "en");
    expect(output).toContain("node_modules/");
    expect(output).toContain(".next/");
    expect(output).toContain("# Logs");
    expect(output.split("dist/").length - 1).toBe(0);
  });

  it("keeps negation rules", () => {
    const output = buildGitignore(["dotenv"], "en");
    expect(output).toContain(".env");
    expect(output).toContain("!.env.example");
  });

  it("returns an empty string when nothing is selected", () => {
    expect(buildGitignore([])).toBe("");
  });

  it("ships a sensible default selection", () => {
    expect(buildGitignore(DEFAULT_IGNORE, "zh")).toContain("# Next.js");
  });
});

describe("svg", () => {
  const source = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" version="1.1">
  <!-- a comment -->
  <metadata>generated</metadata>
  <rect x="1.000000" y="2.500000" width="20.000000" height="20.000000" fill="#fff"/>
</svg>`;

  it("removes comments, metadata and long decimals", () => {
    const result = optimizeSvg(source);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).not.toContain("<!--");
    expect(result.output).not.toContain("<metadata");
    expect(result.output).toContain('x="1"');
    expect(result.output).toContain('y="2.5"');
    expect(result.output).not.toContain('version="1.1"');
    expect(result.after).toBeLessThan(result.before);
  });

  it("keeps comments when the option is off", () => {
    const result = optimizeSvg(source, {
      removeComments: false,
      removeMetadata: false,
      shortenNumbers: false,
    });
    if (!result.ok) throw new Error("optimise failed");
    expect(result.output).toContain("<!--");
    expect(result.output).toContain("1.000000");
  });

  it("rejects non-SVG input", () => {
    const result = optimizeSvg("<div>hello</div>");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toBe("notSvg");
  });

  it("reads width / height or falls back to the viewBox", () => {
    expect(svgSize(source)).toEqual({ width: 24, height: 24, fromViewBox: false });
    const viewBoxOnly = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 18"></svg>';
    expect(svgSize(viewBoxOnly)).toEqual({ width: 32, height: 18, fromViewBox: true });
  });
});

describe("ico writer", () => {
  it("writes a directory that can be read back", () => {
    const ico = buildIco([
      { size: 16, png: new Uint8Array([1, 2, 3, 4]) },
      { size: 256, png: new Uint8Array([5, 6]) },
    ]);
    const entries = readIcoDirectory(ico);
    expect(entries).toEqual([
      { size: 16, length: 4 },
      { size: 256, length: 2 },
    ]);
    expect(ico[0]).toBe(0);
    expect(ico[2]).toBe(1);
  });

  it("rejects an empty icon", () => {
    expect(() => buildIco([])).toThrow();
  });
});

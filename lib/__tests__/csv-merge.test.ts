import { describe, expect, it } from "vitest";
import { appendTables, joinTables } from "@/lib/csv-merge";
import type { CsvTable } from "@/lib/csv";

const table = (header: string[], rows: string[][]): CsvTable => ({ header, rows, delimiter: "," });

describe("appendTables", () => {
  it("unions the headers in first-seen order", () => {
    const result = appendTables(
      [
        table(["id", "name"], [["1", "Alice"]]),
        table(["id", "email"], [["2", "bob@example.com"]]),
      ],
      { mode: "append" }
    );
    expect(result.table.header).toEqual(["id", "name", "email"]);
    expect(result.table.rows).toEqual([
      ["1", "Alice", ""],
      ["2", "", "bob@example.com"],
    ]);
    expect(result.stats.rows).toBe(2);
  });

  it("adds a source column when asked", () => {
    const result = appendTables(
      [table(["id"], [["1"]]), table(["id"], [["2"]])],
      { mode: "append", sourceColumn: true, sourceLabels: ["a.csv", "b.csv"], sourceHeader: "来源" }
    );
    expect(result.table.header).toEqual(["id", "来源"]);
    expect(result.table.rows).toEqual([
      ["1", "a.csv"],
      ["2", "b.csv"],
    ]);
  });
});

describe("joinTables", () => {
  const left = table(
    ["id", "name"],
    [
      ["1", "Alice"],
      ["2", "Bob"],
      ["3", "Carol"],
    ]
  );
  const right = table(
    ["id", "email"],
    [
      ["1", "alice@example.com"],
      ["2", "bob@example.com"],
      ["4", "dave@example.com"],
    ]
  );

  it("joins on the key and keeps every left row", () => {
    const result = joinTables(left, right, { mode: "join", leftKey: "id", rightKey: "id" });
    expect(result.table.header).toEqual(["id", "name", "email"]);
    expect(result.table.rows).toEqual([
      ["1", "Alice", "alice@example.com"],
      ["2", "Bob", "bob@example.com"],
      ["3", "Carol", ""],
    ]);
    expect(result.stats.matched).toBe(2);
    expect(result.stats.leftUnmatched).toBe(1);
    expect(result.stats.rightOnly).toBe(1);
  });

  it("drops unmatched left rows for an inner join", () => {
    const result = joinTables(left, right, {
      mode: "join",
      joinType: "inner",
      leftKey: "id",
      rightKey: "id",
    });
    expect(result.table.rows).toHaveLength(2);
  });

  it("renames colliding columns", () => {
    const rightWithName = table(["id", "name"], [["1", "Alicia"]]);
    const result = joinTables(left, rightWithName, { mode: "join", leftKey: "id", rightKey: "id" });
    expect(result.table.header).toEqual(["id", "name", "name_2"]);
    expect(result.table.rows[0]).toEqual(["1", "Alice", "Alicia"]);
  });

  it("warns about duplicate and empty keys", () => {
    const messy = table(
      ["id", "email"],
      [
        ["1", "first@example.com"],
        ["1", "second@example.com"],
        ["", "orphan@example.com"],
      ]
    );
    const result = joinTables(left, messy, { mode: "join", leftKey: "id", rightKey: "id" });
    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("duplicate-key");
    expect(codes).toContain("empty-key");
    expect(result.table.rows[0]).toEqual(["1", "Alice", "first@example.com"]);
  });
});

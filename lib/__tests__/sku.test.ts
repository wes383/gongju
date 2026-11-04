import { describe, expect, it } from "vitest";
import { isCodedError } from "@/lib/errors";
import { cleanAxes, MAX_SKUS, skuCsv, skuMatrix, type SkuAxis } from "@/lib/sku";

const AXES: SkuAxis[] = [
  { name: "颜色", values: ["红", "蓝", "白"] },
  { name: "尺码", values: ["S", "M"] },
];

function codeOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return isCodedError(error) ? error.code : "uncoded";
  }
  return "no-error";
}

describe("cleanAxes", () => {
  it("trims, drops blanks and removes duplicate values", () => {
    const axes = cleanAxes([
      { name: " 颜色 ", values: [" 红 ", "红", "", "蓝"] },
      { name: "尺码", values: ["  "] },
    ]);
    expect(axes).toEqual([{ name: "颜色", values: ["红", "蓝"] }]);
  });
});

describe("skuMatrix", () => {
  it("walks the cartesian product of every axis", () => {
    const matrix = skuMatrix(AXES, { prefix: "TS", separator: "-" });
    expect(matrix.total).toBe(6);
    expect(matrix.items).toHaveLength(6);
    expect(matrix.items[0].code).toBe("TS-红-S");
    expect(matrix.items[0].values).toEqual(["红", "S"]);
    expect(matrix.items[5].code).toBe("TS-白-M");
  });

  it("numbers the rows instead when asked", () => {
    const matrix = skuMatrix(AXES, { prefix: "TS", codeMode: "index", pad: 3 });
    expect(matrix.items.map((item) => item.code)).toEqual([
      "TS-001",
      "TS-002",
      "TS-003",
      "TS-004",
      "TS-005",
      "TS-006",
    ]);
  });

  it("keeps the order of the first appearance", () => {
    const matrix = skuMatrix([{ name: "色", values: ["白", "黑", "白"] }]);
    expect(matrix.items.map((item) => item.code)).toEqual(["白", "黑"]);
  });

  it("refuses to build a sheet nobody can handle", () => {
    const wide: SkuAxis[] = [
      { name: "A", values: Array.from({ length: 80 }, (_, i) => `a${i}`) },
      { name: "B", values: Array.from({ length: 80 }, (_, i) => `b${i}`) },
    ];
    const code = codeOf(() => skuMatrix(wide));
    expect(code).toBe("sku.limit");
    expect(MAX_SKUS).toBe(5000);
  });

  it("needs at least one axis with a name", () => {
    expect(codeOf(() => skuMatrix([]))).toBe("sku.axis");
    expect(codeOf(() => skuMatrix([{ name: "颜色", values: [] }]))).toBe("sku.axis");
    expect(codeOf(() => skuMatrix([{ name: " ", values: ["红"] }]))).toBe("sku.name");
  });
});

describe("skuCsv", () => {
  it("writes a header and one row per combination", () => {
    const csv = skuCsv(skuMatrix(AXES), "SKU", ["售价", "库存"]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("颜色,尺码,SKU,售价,库存");
    expect(lines[1]).toBe("红,S,红-S,,");
    expect(lines).toHaveLength(7);
  });

  it("quotes values that contain a comma or a quote", () => {
    const csv = skuCsv(skuMatrix([{ name: "款", values: ['A,B"c'] }]));
    expect(csv.split("\r\n")[1]).toBe('"A,B""c","A,B""c"');
  });
});

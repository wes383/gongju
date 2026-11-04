import { describe, expect, it } from "vitest";
import { formatChartNumber, parseChartData, textWidth } from "@/lib/chart";
import { isCodedError } from "@/lib/errors";

describe("parseChartData", () => {
  it("uses the first CSV column as labels and the rest as series", () => {
    const data = parseChartData("月份,销售额,利润\n1月,120,32\n2月,156,41");
    expect(data.format).toBe("csv");
    expect(data.labels).toEqual(["1月", "2月"]);
    expect(data.series.map((series) => series.name)).toEqual(["销售额", "利润"]);
    expect(data.series[0].values).toEqual([120, 156]);
  });

  it("ignores non-numeric columns and keeps empty cells as gaps", () => {
    const data = parseChartData("名称,数量,备注\nA,12,顺利\nB,,卡住了\nC,8,正常");
    expect(data.series.map((series) => series.name)).toEqual(["数量"]);
    expect(data.series[0].values).toEqual([12, null, 8]);
  });

  it("falls back to row numbers for a single numeric column", () => {
    const data = parseChartData("value\n3\n8\n5");
    expect(data.labels).toEqual(["#1", "#2", "#3"]);
    expect(data.series[0]).toMatchObject({ name: "value", values: [3, 8, 5] });
  });

  it("splits a JSON object array into a label key and numeric keys", () => {
    const data = parseChartData(
      '[{"day":"周一","visits":820,"signups":46},{"day":"周二","visits":910,"signups":52}]'
    );
    expect(data.format).toBe("json");
    expect(data.labels).toEqual(["周一", "周二"]);
    expect(data.series.map((series) => series.name)).toEqual(["visits", "signups"]);
    expect(data.series[1].values).toEqual([46, 52]);
  });

  it("accepts a label to number object as one series", () => {
    const data = parseChartData('{"苹果":12,"香蕉":5}', { valueLabel: "数量" });
    expect(data.labels).toEqual(["苹果", "香蕉"]);
    expect(data.series).toHaveLength(1);
    expect(data.series[0]).toMatchObject({ name: "数量", values: [12, 5] });
  });

  it("accepts a bare number array", () => {
    const data = parseChartData("[3, 9, 4]");
    expect(data.labels).toEqual(["#1", "#2", "#3"]);
    expect(data.series[0].values).toEqual([3, 9, 4]);
  });

  it("throws a coded error when the table has no numeric column", () => {
    try {
      parseChartData("a,b\nx,y");
      expect.unreachable();
    } catch (error) {
      expect(isCodedError(error) && error.code).toBe("chart.noSeries");
    }
  });
});

describe("formatting helpers", () => {
  it("abbreviates large numbers", () => {
    expect(formatChartNumber(120)).toBe("120");
    expect(formatChartNumber(12500)).toBe("12.5k");
    expect(formatChartNumber(-2300000)).toBe("-2.3M");
  });

  it("measures CJK glyphs as full width", () => {
    expect(textWidth("中文", 12)).toBe(24);
    expect(textWidth("ab", 12)).toBeCloseTo(13.2);
  });
});


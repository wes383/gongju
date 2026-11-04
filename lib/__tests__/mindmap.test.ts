import { describe, expect, it } from "vitest";
import { LIGHT_THEME } from "@/lib/chart";
import { layoutMindmap, parseOutline, renderMindmapSvg } from "@/lib/mindmap";
import { isCodedError } from "@/lib/errors";

describe("parseOutline", () => {
  it("builds a tree from indentation", () => {
    const root = parseOutline("产品规划\n  用户研究\n    访谈\n  功能设计");
    expect(root.label).toBe("产品规划");
    expect(root.children.map((child) => child.label)).toEqual(["用户研究", "功能设计"]);
    expect(root.children[0].children[0].label).toBe("访谈");
  });

  it("understands markdown headings", () => {
    const root = parseOutline("# 目标\n## 增长\n### 拉新\n## 体验");
    expect(root.label).toBe("目标");
    expect(root.children.map((child) => child.label)).toEqual(["增长", "体验"]);
    expect(root.children[0].children[0].label).toBe("拉新");
  });

  it("attaches extra top-level entries to the centre topic", () => {
    const root = parseOutline("中心\n分支 A\n分支 B");
    expect(root.label).toBe("中心");
    expect(root.children.map((child) => child.label)).toEqual(["分支 A", "分支 B"]);
  });

  it("strips list markers", () => {
    const root = parseOutline("- 中心\n  - 子项");
    expect(root.label).toBe("中心");
    expect(root.children[0].label).toBe("子项");
  });

  it("throws a coded error for empty input", () => {
    try {
      parseOutline("   \n\n");
      expect.unreachable();
    } catch (error) {
      expect(isCodedError(error) && error.code).toBe("mindmap.empty");
    }
  });

  it("rejects outlines deeper than the limit", () => {
    const lines = ["中心"];
    for (let depth = 1; depth <= 8; depth += 1) lines.push(`${" ".repeat(depth * 2)}层 ${depth}`);
    try {
      parseOutline(lines.join("\n"));
      expect.unreachable();
    } catch (error) {
      expect(isCodedError(error) && error.code).toBe("mindmap.tooDeep");
    }
  });
});

describe("layoutMindmap", () => {
  it("stacks leaves in order and centres the parent", () => {
    const layout = layoutMindmap(parseOutline("中心\n  一\n  二"));
    expect(layout.nodes).toHaveLength(3);
    expect(layout.nodes[1].y).toBeLessThan(layout.nodes[2].y);
    expect(layout.nodes[0].y).toBeCloseTo((layout.nodes[1].y + layout.nodes[2].y) / 2);
    expect(layout.edges).toHaveLength(2);
    expect(layout.width).toBeGreaterThan(200);
  });

  it("puts each depth in its own column", () => {
    const layout = layoutMindmap(parseOutline("中心\n  一\n    一.1"));
    expect(layout.nodes[1].x).toBeGreaterThan(layout.nodes[0].x);
    expect(layout.nodes[2].x).toBeGreaterThan(layout.nodes[1].x);
  });
});

describe("renderMindmapSvg", () => {
  it("emits a self-contained svg with node labels", () => {
    const svg = renderMindmapSvg(parseOutline("中心 <测试>\n  子项"), { theme: LIGHT_THEME });
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("中心 &lt;测试&gt;");
    expect(svg).toContain("<path");
    expect(svg).toContain("<rect");
  });
});

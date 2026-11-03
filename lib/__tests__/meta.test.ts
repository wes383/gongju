import { describe, expect, it } from "vitest";
import {
  auditMeta,
  buildMetaTags,
  DEFAULT_META,
  estimateWidth,
  parseMetaTags,
  truncateToWidth,
  META_SAMPLE,
} from "@/lib/meta";

const FIELDS = {
  ...DEFAULT_META,
  title: "JSON 格式化工具 - 在线校验与美化",
  description:
    "免费在线 JSON 格式化、压缩与校验工具，语法错误精确到行列，支持 JSONPath 查询与 Schema 校验，全部在本地完成。",
  canonical: "https://gongju.example/tools/json-format",
  image: "https://gongju.example/og/json.png",
  siteName: "GongJu",
};

describe("buildMetaTags", () => {
  it("emits the core tags and skips empty fields", () => {
    const html = buildMetaTags(FIELDS);
    expect(html).toContain("<title>JSON 格式化工具 - 在线校验与美化</title>");
    expect(html).toContain('<meta name="description"');
    expect(html).toContain('<link rel="canonical"');
    expect(html).toContain('<meta property="og:image"');
    expect(html).toContain('<meta name="twitter:card"');
    expect(html).not.toContain("keywords");
  });

  it("escapes quotes in attribute values", () => {
    const html = buildMetaTags({ ...FIELDS, siteName: 'A "quoted" site' });
    expect(html).toContain("&quot;quoted&quot;");
  });
});

describe("parseMetaTags", () => {
  it("reads a pasted head block", () => {
    const parsed = parseMetaTags(META_SAMPLE);
    expect(parsed.title).toBe("JSON 格式化工具 - 在线校验与美化 | GongJu");
    expect(parsed.image).toBe("https://gongju.example/og/json.png");
    expect(parsed.siteName).toBe("GongJu");
    expect(parsed.canonical).toBe("https://gongju.example/tools/json-format");
    expect(parsed.description?.startsWith("免费在线 JSON")).toBe(true);
  });

  it("survives HTML without a title", () => {
    expect(parseMetaTags("<html><body>hi</body></html>")).toEqual({});
  });
});

describe("auditMeta", () => {
  it("passes a well-formed set", () => {
    expect(auditMeta(FIELDS)).toEqual([]);
  });

  it("flags what costs clicks", () => {
    const codes = auditMeta({
      ...DEFAULT_META,
      title: "Short",
      description: "",
      image: "/og.png",
      canonical: "/tools/x",
    }).map((issue) => issue.code);
    expect(codes).toContain("title-short");
    expect(codes).toContain("description-missing");
    expect(codes).toContain("image-relative");
    expect(codes).toContain("canonical-relative");
    expect(codes).toContain("site-name-missing");
  });

  it("flags an overlong title", () => {
    const issues = auditMeta({ ...FIELDS, title: "长".repeat(80) });
    expect(issues[0].code).toBe("title-long");
    expect(issues[0].length).toBe(80);
  });
});

describe("preview helpers", () => {
  it("estimates CJK as wider than Latin", () => {
    expect(estimateWidth("中文")).toBeGreaterThan(estimateWidth("ab"));
  });

  it("truncates to the pixel budget with an ellipsis", () => {
    const long = "这是一个非常长的标题".repeat(10);
    const cut = truncateToWidth(long, 580);
    expect(cut.endsWith("…")).toBe(true);
    expect(estimateWidth(cut)).toBeLessThanOrEqual(580);
  });

  it("keeps short text as is", () => {
    expect(truncateToWidth("短标题", 580)).toBe("短标题");
  });
});

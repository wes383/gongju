import { describe, expect, it } from "vitest";
import { localeFromPath, localePath, switchLocalePath } from "@/lib/i18n";

describe("locale paths", () => {
  it("keeps english at the root and prefixes chinese", () => {
    expect(localePath("en", "/tools/base64")).toBe("/tools/base64");
    expect(localePath("zh", "/tools/base64")).toBe("/zh/tools/base64");
    expect(localePath("zh", "/")).toBe("/zh");
  });

  it("reads the locale back from a pathname", () => {
    expect(localeFromPath("/")).toBe("en");
    expect(localeFromPath("/tools/base64")).toBe("en");
    expect(localeFromPath("/zh")).toBe("zh");
    expect(localeFromPath("/zh/tools/base64")).toBe("zh");
    expect(localeFromPath("/zhx")).toBe("en");
  });

  it("switches locales without losing the page", () => {
    expect(switchLocalePath("/tools/base64", "zh")).toBe("/zh/tools/base64");
    expect(switchLocalePath("/zh/tools/base64", "en")).toBe("/tools/base64");
    expect(switchLocalePath("/", "zh")).toBe("/zh");
    expect(switchLocalePath("/zh", "en")).toBe("/");
    expect(switchLocalePath("/zh/privacy", "en")).toBe("/privacy");
  });
});
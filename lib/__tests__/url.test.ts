import { describe, expect, it } from "vitest";
import { parseQuery, parseUrl } from "@/lib/url";

describe("parseQuery", () => {
  it("decodes percent escapes and plus signs", () => {
    const [first, second] = parseQuery("?q=hello+world&city=%E5%8C%97%E4%BA%AC");
    expect(first).toMatchObject({ name: "q", value: "hello world", hasValue: true, encoded: true });
    expect(second.value).toBe("北京");
  });

  it("keeps duplicate keys in order", () => {
    const params = parseQuery("tag=a&tag=b&tag=c");
    expect(params.map((p) => p.value)).toEqual(["a", "b", "c"]);
  });

  it("marks bare flags as having no value", () => {
    const [flag] = parseQuery("?debug");
    expect(flag).toMatchObject({ name: "debug", value: "", hasValue: false, encoded: false });
  });

  it("treats an empty value after = as present", () => {
    const [empty] = parseQuery("?empty=");
    expect(empty.hasValue).toBe(true);
    expect(empty.value).toBe("");
  });

  it("returns nothing for an empty query", () => {
    expect(parseQuery("")).toEqual([]);
    expect(parseQuery("?")).toEqual([]);
  });

  it("keeps malformed escapes verbatim instead of throwing", () => {
    const [broken] = parseQuery("?a=%E4%B8");
    expect(broken.value).toBe("%E4%B8");
  });
});

describe("parseUrl", () => {
  const url = parseUrl("https://user:pw@example.com:8443/api/v1/items?tag=a&tag=b#top");

  it("splits the components", () => {
    expect(url.scheme).toBe("https");
    expect(url.protocol).toBe("https:");
    expect(url.username).toBe("user");
    expect(url.password).toBe("pw");
    expect(url.hostname).toBe("example.com");
    expect(url.port).toBe("8443");
    expect(url.host).toBe("example.com:8443");
    expect(url.pathname).toBe("/api/v1/items");
    expect(url.search).toBe("?tag=a&tag=b");
    expect(url.hash).toBe("#top");
    expect(url.origin).toBe("https://example.com:8443");
    expect(url.params).toHaveLength(2);
  });

  it("drops the default port", () => {
    expect(parseUrl("https://example.com:443/x").port).toBe("");
  });

  it("assumes https when the scheme is missing", () => {
    const bare = parseUrl("example.com/a?b=1");
    expect(bare.assumedScheme).toBe(true);
    expect(bare.href).toBe("https://example.com/a?b=1");
    expect(parseUrl("https://example.com").assumedScheme).toBe(false);
  });

  it("keeps protocol-relative URLs free of an assumed scheme", () => {
    const relative = parseUrl("//cdn.example.com/lib.js");
    expect(relative.assumedScheme).toBe(false);
    expect(relative.hostname).toBe("cdn.example.com");
  });

  it("flags IP hosts", () => {
    expect(parseUrl("http://192.168.1.1/").isIpHost).toBe(true);
    expect(parseUrl("http://[2001:db8::1]/").isIpHost).toBe(true);
    expect(parseUrl("http://example.com/").isIpHost).toBe(false);
  });

  it("leaves origin empty for opaque schemes", () => {
    const mail = parseUrl("mailto:someone@example.com");
    expect(mail.origin).toBe("");
    expect(mail.params).toEqual([]);
  });

  it("throws a coded error for junk and empty input", () => {
    expect(() => parseUrl("")).toThrowError(/url\.empty/);
    expect(() => parseUrl("http://")).toThrowError(/url\.invalid/);
    expect(() => parseUrl("https://exa mple.com")).toThrowError(/url\.invalid/);
  });
});

import { describe, expect, it } from "vitest";
import { analyzeIp } from "@/lib/ip";

describe("analyzeIp — IPv4", () => {
  const info = analyzeIp("192.168.1.10");

  it("identifies the family and range", () => {
    expect(info.family).toBe("ipv4");
    expect(info.canonical).toBe("192.168.1.10");
    expect(info.range).toBe("private");
    expect(info.cidr).toBeNull();
  });

  it("derives the numeric forms", () => {
    expect(info.hex).toBe("0xc0a8010a");
    expect(info.decimal).toBe("3232235786");
    expect(info.binary).toBe("11000000.10101000.00000001.00001010");
    expect(info.reversed).toBe("10.1.168.192.in-addr.arpa");
  });

  it("classifies special ranges", () => {
    expect(analyzeIp("127.0.0.1").range).toBe("loopback");
    expect(analyzeIp("169.254.1.1").range).toBe("linkLocal");
    expect(analyzeIp("100.64.0.1").range).toBe("carrierGradeNat");
    expect(analyzeIp("8.8.8.8").range).toBe("unicast");
    expect(analyzeIp("224.0.0.1").range).toBe("multicast");
  });
});

describe("analyzeIp — CIDR", () => {
  it("computes the /24 block", () => {
    const { cidr } = analyzeIp("192.168.1.10/24");
    expect(cidr).toMatchObject({
      prefix: 24,
      network: "192.168.1.0",
      last: "192.168.1.255",
      mask: "255.255.255.0",
      firstHost: "192.168.1.1",
      lastHost: "192.168.1.254",
      hosts: "254",
    });
  });

  it("treats a /31 as a point-to-point link", () => {
    const { cidr } = analyzeIp("10.0.0.0/31");
    expect(cidr).toMatchObject({ firstHost: "10.0.0.0", lastHost: "10.0.0.1", hosts: "2" });
  });

  it("treats a /32 as a single host", () => {
    const { cidr } = analyzeIp("10.0.0.7/32");
    expect(cidr).toMatchObject({ firstHost: "10.0.0.7", lastHost: "10.0.0.7", hosts: "1" });
  });

  it("handles a /0", () => {
    const { cidr } = analyzeIp("0.0.0.0/0");
    expect(cidr?.mask).toBe("0.0.0.0");
    expect(cidr?.last).toBe("255.255.255.255");
  });
});

describe("analyzeIp — IPv6", () => {
  const info = analyzeIp("2001:db8::1");

  it("normalises and expands the address", () => {
    expect(info.family).toBe("ipv6");
    expect(info.canonical).toBe("2001:db8::1");
    expect(info.expanded).toBe("2001:0db8:0000:0000:0000:0000:0000:0001");
    expect(info.range).toBe("reserved");
  });

  it("renders the binary and reverse forms", () => {
    expect(info.binary.startsWith("0010000000000001:0000110110111000")).toBe(true);
    expect(info.binary.split(":")).toHaveLength(8);
    expect(info.reversed.endsWith(".ip6.arpa")).toBe(true);
    expect(info.reversed.startsWith("1.0.0.0.")).toBe(true);
  });

  it("classifies the special prefixes", () => {
    expect(analyzeIp("::1").range).toBe("loopback");
    expect(analyzeIp("fe80::1").range).toBe("linkLocal");
    expect(analyzeIp("fc00::1").range).toBe("uniqueLocal");
    expect(analyzeIp("ff02::1").range).toBe("multicast");
  });

  it("exposes the embedded IPv4 of a mapped address", () => {
    const mapped = analyzeIp("::ffff:192.168.0.1");
    expect(mapped.range).toBe("ipv4Mapped");
    expect(mapped.mappedV4).toBe("192.168.0.1");
  });

  it("computes the /64 block", () => {
    const { cidr } = analyzeIp("2001:db8::1/64");
    expect(cidr?.network).toBe("2001:db8::");
    expect(cidr?.prefix).toBe(64);
    expect(cidr?.hosts.length).toBeGreaterThan(15);
  });
});

describe("analyzeIp — rejections", () => {
  it("throws for empty and malformed input", () => {
    expect(() => analyzeIp("")).toThrowError(/ip\.empty/);
    expect(() => analyzeIp("256.1.1.1")).toThrowError(/ip\.invalid/);
    expect(() => analyzeIp("192.168.1")).toThrowError(/ip\.invalid/);
    expect(() => analyzeIp("not-an-ip")).toThrowError(/ip\.invalid/);
  });

  it("rejects a prefix longer than the address", () => {
    expect(() => analyzeIp("10.0.0.1/33")).toThrowError(/ip\.badPrefix/);
    expect(() => analyzeIp("2001:db8::1/129")).toThrowError(/ip\.badPrefix/);
    expect(() => analyzeIp("10.0.0.1/x")).toThrowError(/ip\.badPrefix/);
  });
});

"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ClearButton, CopyButton, ErrorNote } from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { errorText, safe } from "@/lib/errors";
import { analyzeIp } from "@/lib/ip";

const COPY = {
  zh: {
    placeholder: "输入 IPv4、IPv6 或网段，例如 192.168.1.10/24",
    samples: "试试：",
    canonical: "规范化",
    expanded: "完整形式",
    binary: "二进制",
    hex: "十六进制",
    decimal: "十进制",
    reversed: "反向解析",
    range: "地址类型",
    network: "网段",
    last: "结束地址",
    mask: "子网掩码",
    hostRange: "可用范围",
    hosts: "可用主机数",
    prefix: "前缀",
    mappedV4: "IPv4 映射到",
    noCidr: "在后面加 /24 这类前缀，可以得到网段、掩码和可用主机范围。",
    note: "地址类型（私有、回环、链路本地等）由 ipaddr.js 的区间表判定。",
    hostCount: (value: string) =>
      value.length > 12 ? `≈ ${Number(value).toExponential(2)}` : value,
    ranges: {
      unicast: "公网地址",
      private: "私有地址",
      loopback: "回环地址",
      linkLocal: "链路本地",
      multicast: "组播地址",
      broadcast: "广播地址",
      carrierGradeNat: "运营商级 NAT",
      reserved: "保留地址",
      unspecified: "未指定地址",
      uniqueLocal: "唯一本地地址",
      ipv4Mapped: "IPv4 映射地址",
      "6to4": "6to4 隧道",
      rfc6052: "NAT64 转换",
      rfc6145: "IPv4/IPv6 转换",
      teredo: "Teredo 隧道",
      benchmarking: "基准测试段",
      amt: "AMT 段",
      as112: "AS112 服务段",
    } as Record<string, string>,
  },
  en: {
    placeholder: "Enter an IPv4, IPv6 or CIDR block, e.g. 192.168.1.10/24",
    samples: "Try:",
    canonical: "Canonical",
    expanded: "Expanded",
    binary: "Binary",
    hex: "Hex",
    decimal: "Decimal",
    reversed: "Reverse DNS",
    range: "Address type",
    network: "Network",
    last: "Last address",
    mask: "Subnet mask",
    hostRange: "Usable range",
    hosts: "Usable hosts",
    prefix: "Prefix",
    mappedV4: "Maps to IPv4",
    noCidr: "Add a prefix such as /24 to see the network, mask and usable host range.",
    note: "Address types (private, loopback, link-local, …) come from the ipaddr.js range tables.",
    hostCount: (value: string) =>
      value.length > 12 ? `≈ ${Number(value).toExponential(2)}` : value,
    ranges: {
      unicast: "Public unicast",
      private: "Private",
      loopback: "Loopback",
      linkLocal: "Link-local",
      multicast: "Multicast",
      broadcast: "Broadcast",
      carrierGradeNat: "Carrier-grade NAT",
      reserved: "Reserved",
      unspecified: "Unspecified",
      uniqueLocal: "Unique local",
      ipv4Mapped: "IPv4-mapped",
      "6to4": "6to4 tunnel",
      rfc6052: "NAT64",
      rfc6145: "IPv4/IPv6 translation",
      teredo: "Teredo tunnel",
      benchmarking: "Benchmarking",
      amt: "AMT",
      as112: "AS112",
    } as Record<string, string>,
  },
};

const SAMPLES = ["192.168.1.10/24", "10.0.0.1", "2001:db8::1/64", "::1", "100.64.0.1"];

const RANGE_VARIANT: Record<
  string,
  "success" | "info" | "warning" | "danger" | "outline" | "secondary"
> = {
  unicast: "success",
  private: "info",
  carrierGradeNat: "info",
  loopback: "secondary",
  linkLocal: "warning",
  uniqueLocal: "warning",
  multicast: "warning",
  broadcast: "danger",
  reserved: "outline",
  unspecified: "outline",
  ipv4Mapped: "outline",
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 px-4 py-2">
      <span className="w-24 shrink-0 font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
        {label}
      </span>
      <span className="min-w-0 flex-1 break-all font-mono text-xs text-foreground">{value}</span>
      <CopyButton value={value} size="icon-xs" />
    </div>
  );
}

export function IpTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [input, setInput] = React.useState("");

  const { value: info, error } = React.useMemo(
    () => safe(() => (input.trim() ? analyzeIp(input) : null)),
    [input]
  );

  const rangeLabel = info ? (t.ranges[info.range] ?? info.range) : "";
  const variant = info ? (RANGE_VARIANT[info.range] ?? "outline") : "outline";
  const cidr = info?.cidr;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3">
        <div className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.placeholder}
            aria-label="IP"
            spellCheck={false}
            className="font-mono text-sm"
            size="xs"
          />
          <ClearButton onClick={() => setInput("")} />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-foreground-subtle">{t.samples}</span>
          {SAMPLES.map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => setInput(sample)}
              className="rounded-full border border-border px-2.5 py-1 font-mono text-[11px] text-foreground-muted transition-colors hover:border-border-strong hover:bg-hover-bg hover:text-foreground"
            >
              {sample}
            </button>
          ))}
        </div>
      </div>

      {error && input.trim() !== "" && <ErrorNote>{errorText(error, locale)}</ErrorNote>}

      {info && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default" size="sm">
              {info.family === "ipv4" ? "IPv4" : "IPv6"}
            </Badge>
            <Badge variant={variant} size="sm" dot>
              {rangeLabel}
            </Badge>
            {cidr && (
              <Badge variant="outline" size="sm">
                /{cidr.prefix}
              </Badge>
            )}
            {info.mappedV4 && (
              <Badge variant="outline" size="sm">
                {t.mappedV4} {info.mappedV4}
              </Badge>
            )}
          </div>

          <section className="overflow-hidden rounded-lg border border-border bg-surface">
            <div className="divide-y divide-border">
              <Row label={t.canonical} value={info.canonical} />
              {info.expanded && <Row label={t.expanded} value={info.expanded} />}
              <Row label={t.decimal} value={info.decimal} />
              <Row label={t.hex} value={info.hex} />
              <Row label={t.binary} value={info.binary} />
              <Row label={t.reversed} value={info.reversed} />
            </div>
          </section>

          {cidr ? (
            <section className="overflow-hidden rounded-lg border border-border bg-surface">
              <header className="flex h-10 items-center border-b border-border px-3">
                <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
                  {t.network}
                </span>
              </header>
              <div className="divide-y divide-border">
                <Row label={t.network} value={`${cidr.network}/${cidr.prefix}`} />
                <Row label={t.last} value={cidr.last} />
                {cidr.mask && <Row label={t.mask} value={cidr.mask} />}
                <Row
                  label={t.hostRange}
                  value={
                    cidr.firstHost && cidr.lastHost
                      ? `${cidr.firstHost} – ${cidr.lastHost}`
                      : "—"
                  }
                />
                <div className="flex items-start gap-3 px-4 py-2">
                  <span className="w-24 shrink-0 font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
                    {t.hosts}
                  </span>
                  <span className="min-w-0 flex-1 break-all font-mono text-xs text-foreground">
                    {t.hostCount(cidr.hosts)}
                  </span>
                </div>
              </div>
              <footer className="border-t border-border px-4 py-2 text-[11px] leading-relaxed text-foreground-subtle">
                {t.note}
              </footer>
            </section>
          ) : (
            <p className="text-xs leading-relaxed text-foreground-subtle">{t.noCidr}</p>
          )}
        </>
      )}
    </div>
  );
}

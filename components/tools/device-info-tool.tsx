"use client";

import * as React from "react";
import { Monitor } from "lucide-react";
import { useCopy } from "@/components/locale-provider";
import { CopyButton } from "@/components/tools/tool-ui";

const COPY = {
  zh: {
    groups: {
      screen: "屏幕",
      viewport: "视口",
      device: "设备与系统",
      network: "网络",
    },
    labels: {
      resolution: "屏幕分辨率",
      available: "可用区域",
      dpr: "设备像素比",
      colorDepth: "色深",
      orientation: "屏幕方向",
      inner: "窗口内尺寸",
      client: "文档可视区",
      scrollbar: "滚动条宽度",
      ua: "User-Agent",
      platform: "平台",
      language: "语言",
      languages: "首选语言列表",
      timezone: "时区",
      cores: "逻辑 CPU 核数",
      memory: "设备内存",
      touch: "触摸支持",
      maxTouch: "最大触点",
      cookies: "Cookie 可用",
      effectiveType: "网络类型",
      downlink: "下行带宽估算",
      rtt: "往返时延估算",
      saveData: "省流模式",
      unknown: "未提供",
    },
    copyAll: "复制全部",
    note: "这些值由浏览器提供，可能因设备、权限或隐私设置而不准确。屏幕分辨率是物理像素，窗口尺寸不含滚动条。",
  },
  en: {
    groups: {
      screen: "Screen",
      viewport: "Viewport",
      device: "Device and system",
      network: "Network",
    },
    labels: {
      resolution: "Screen resolution",
      available: "Available area",
      dpr: "Device pixel ratio",
      colorDepth: "Colour depth",
      orientation: "Orientation",
      inner: "Window inner size",
      client: "Document viewport",
      scrollbar: "Scrollbar width",
      ua: "User-Agent",
      platform: "Platform",
      language: "Language",
      languages: "Preferred languages",
      timezone: "Time zone",
      cores: "Logical CPU cores",
      memory: "Device memory",
      touch: "Touch support",
      maxTouch: "Max touch points",
      cookies: "Cookies enabled",
      effectiveType: "Connection type",
      downlink: "Estimated downlink",
      rtt: "Estimated RTT",
      saveData: "Data saver",
      unknown: "not exposed",
    },
    copyAll: "Copy all",
    note: "These values come from the browser and can be inaccurate depending on the device, permissions or privacy settings. Screen resolution is in physical pixels; the viewport excludes scrollbars.",
  },
};

type Group = keyof typeof COPY.zh.groups;
type Label = keyof typeof COPY.zh.labels;

interface Row {
  label: Label;
  value: string;
}

const GROUPS: { id: Group; rows: Label[] }[] = [
  {
    id: "screen",
    rows: ["resolution", "available", "dpr", "colorDepth", "orientation"],
  },
  {
    id: "viewport",
    rows: ["inner", "client", "scrollbar"],
  },
  {
    id: "device",
    rows: ["ua", "platform", "language", "languages", "timezone", "cores", "memory", "touch", "maxTouch", "cookies"],
  },
  {
    id: "network",
    rows: ["effectiveType", "downlink", "rtt", "saveData"],
  },
];

interface Connection {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

function collect(unknownLabel: string): Record<Label, string> {
  const screenInfo = window.screen;
  const root = document.documentElement;
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: Connection;
    userAgentData?: { platform?: string };
  };
  const connection = nav.connection;

  return {
    resolution: `${screenInfo.width} × ${screenInfo.height}`,
    available: `${screenInfo.availWidth} × ${screenInfo.availHeight}`,
    dpr: String(window.devicePixelRatio),
    colorDepth: `${screenInfo.colorDepth} bit`,
    orientation: screenInfo.orientation?.type ?? unknownLabel,
    inner: `${window.innerWidth} × ${window.innerHeight}`,
    client: `${root.clientWidth} × ${root.clientHeight}`,
    scrollbar: `${window.innerWidth - root.clientWidth} px`,
    ua: nav.userAgent,
    platform: nav.userAgentData?.platform ?? nav.platform ?? unknownLabel,
    language: nav.language,
    languages: nav.languages?.join(", ") || unknownLabel,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    cores: nav.hardwareConcurrency ? String(nav.hardwareConcurrency) : unknownLabel,
    memory: nav.deviceMemory ? `${nav.deviceMemory} GB` : unknownLabel,
    touch: "ontouchstart" in window ? "✓" : "✗",
    maxTouch: String(nav.maxTouchPoints ?? 0),
    cookies: nav.cookieEnabled ? "✓" : "✗",
    effectiveType: connection?.effectiveType ?? unknownLabel,
    downlink: connection?.downlink != null ? `${connection.downlink} Mb/s` : unknownLabel,
    rtt: connection?.rtt != null ? `${connection.rtt} ms` : unknownLabel,
    saveData: connection?.saveData == null ? unknownLabel : connection.saveData ? "✓" : "✗",
    unknown: unknownLabel,
  };
}

export function DeviceInfoTool() {
  const t = useCopy(COPY);
  const [data, setData] = React.useState<Record<Label, string> | null>(null);

  React.useEffect(() => {
    const read = () => setData(collect(t.labels.unknown));
    const id = window.setTimeout(read, 0);
    window.addEventListener("resize", read);
    window.addEventListener("orientationchange", read);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("resize", read);
      window.removeEventListener("orientationchange", read);
    };
  }, [t.labels.unknown]);

  const rows = (list: Label[]): Row[] =>
    list.map((label) => ({ label, value: data?.[label] ?? "—" }));

  const text = GROUPS.map((group) => {
    const lines = rows(group.rows).map((row) => `${t.labels[row.label]}: ${row.value}`);
    return [`[${t.groups[group.id]}]`, ...lines].join("\n");
  }).join("\n\n");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3">
        <span className="flex items-center gap-2 text-xs font-medium text-foreground-muted">
          <Monitor className="h-3.5 w-3.5" />
          {t.groups.screen}
          <span className="font-mono text-[11px] text-foreground-faint">
            {data?.resolution ?? "—"}
          </span>
        </span>
        <CopyButton value={text} label={t.copyAll} className="ml-auto" />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {GROUPS.map((group) => (
          <section
            key={group.id}
            className="overflow-hidden rounded-lg border border-border bg-surface"
          >
            <header className="border-b border-border px-4 py-2 text-xs font-medium text-foreground-muted">
              {t.groups[group.id]}
            </header>
            {rows(group.rows).map((row) => (
              <div
                key={row.label}
                className="flex items-baseline gap-3 border-b border-border px-4 py-2 last:border-b-0"
              >
                <span className="w-32 shrink-0 text-[11px] text-foreground-subtle">
                  {t.labels[row.label]}
                </span>
                <span className="min-w-0 flex-1 break-all font-mono text-[11.5px] text-foreground">
                  {row.value}
                </span>
              </div>
            ))}
          </section>
        ))}
      </div>

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}

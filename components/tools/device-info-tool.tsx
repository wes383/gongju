"use client";

import * as React from "react";
import { Monitor } from "lucide-react";
import { useCopy } from "@/components/locale-provider";
import { CopyButton } from "@/components/tools/tool-ui";
import {
  deviceKind,
  formatBytes,
  formatDuration,
  formatUtcOffset,
  pickUaBrand,
  type UaBrand,
} from "@/lib/device";

const COPY = {
  zh: {
    groups: {
      screen: "屏幕",
      viewport: "视口",
      device: "设备与系统",
      display: "偏好与显示",
      graphics: "图形",
      network: "网络",
      storage: "存储",
      permissions: "权限",
      media: "媒体能力",
      page: "页面",
    },
    labels: {
      resolution: "屏幕分辨率",
      available: "可用区域",
      dpr: "设备像素比",
      colorDepth: "色深",
      orientation: "屏幕方向",
      orientationAngle: "方向角度",
      inner: "窗口内尺寸",
      client: "文档可视区",
      scrollbar: "滚动条宽度",
      ua: "User-Agent",
      uaBrands: "浏览器标识",
      kind: "设备类型",
      platform: "平台",
      language: "语言",
      languages: "首选语言列表",
      timezone: "时区",
      tzOffset: "时区偏移",
      cores: "逻辑 CPU 核数",
      memory: "设备内存",
      battery: "电池",
      touch: "触摸支持",
      maxTouch: "最大触点",
      pointer: "主指针精度",
      anyPointer: "任意指针精度",
      hover: "悬停能力",
      cookies: "Cookie 可用",
      doNotTrack: "请勿追踪",
      secureContext: "安全上下文",
      colorScheme: "配色偏好",
      reducedMotion: "动效偏好",
      contrast: "对比度偏好",
      colorGamut: "色域",
      dynamicRange: "动态范围",
      displayMode: "显示模式",
      glVendor: "显卡厂商",
      glRenderer: "显卡渲染器",
      webgl2: "WebGL 2",
      webgpu: "WebGPU",
      maxTexture: "最大纹理尺寸",
      online: "在线状态",
      effectiveType: "网络类型",
      downlink: "下行带宽估算",
      rtt: "往返时延估算",
      saveData: "省流模式",
      quota: "存储配额",
      usage: "已用存储",
      localStorage: "localStorage",
      indexedDB: "IndexedDB",
      serviceWorker: "Service Worker",
      geoPerm: "定位权限",
      notifyPerm: "通知权限",
      cameraPerm: "摄像头权限",
      micPerm: "麦克风权限",
      sampleRate: "音频采样率",
      codecH264: "H.264",
      codecHevc: "HEVC",
      codecVp9: "VP9",
      codecAv1: "AV1",
      codecAac: "AAC",
      codecOpus: "Opus",
      protocol: "协议",
      loadTime: "页面加载耗时",
      heap: "JS 堆内存",
      unknown: "未提供",
    },
    kinds: { mobile: "手机", tablet: "平板", desktop: "桌面" },
    charging: "（充电中）",
    perms: { granted: "已授权", denied: "已拒绝", prompt: "会询问", unknown: "未知" },
    schemes: { dark: "深色", light: "浅色", auto: "跟随系统" },
    motions: { reduce: "减少动效", normal: "正常" },
    contrasts: { more: "高对比", less: "低对比", normal: "标准" },
    ranges: { high: "高（HDR）", standard: "标准" },
    pointers: { fine: "精细（鼠标）", coarse: "粗略（触摸）", none: "无" },
    hovers: { yes: "支持", no: "不支持" },
    modes: { standalone: "独立应用", fullscreen: "全屏", minimal: "极简", browser: "浏览器标签" },
    copyAll: "复制全部",
    copyJson: "复制 JSON",
    note: "全部在本机读取，不会上传。较新的字段（显卡、设备内存、网络类型、电池）只有部分浏览器提供，显示「未提供」属正常；分辨率是物理像素，视口不含滚动条。",
  },
  en: {
    groups: {
      screen: "Screen",
      viewport: "Viewport",
      device: "Device and system",
      display: "Preferences and display",
      graphics: "Graphics",
      network: "Network",
      storage: "Storage",
      permissions: "Permissions",
      media: "Media support",
      page: "Page",
    },
    labels: {
      resolution: "Screen resolution",
      available: "Available area",
      dpr: "Device pixel ratio",
      colorDepth: "Colour depth",
      orientation: "Orientation",
      orientationAngle: "Orientation angle",
      inner: "Window inner size",
      client: "Document viewport",
      scrollbar: "Scrollbar width",
      ua: "User-Agent",
      uaBrands: "Browser brand",
      kind: "Device type",
      platform: "Platform",
      language: "Language",
      languages: "Preferred languages",
      timezone: "Time zone",
      tzOffset: "UTC offset",
      cores: "Logical CPU cores",
      memory: "Device memory",
      battery: "Battery",
      touch: "Touch support",
      maxTouch: "Max touch points",
      pointer: "Primary pointer",
      anyPointer: "Any pointer",
      hover: "Hover",
      cookies: "Cookies enabled",
      doNotTrack: "Do Not Track",
      secureContext: "Secure context",
      colorScheme: "Colour scheme",
      reducedMotion: "Motion",
      contrast: "Contrast",
      colorGamut: "Colour gamut",
      dynamicRange: "Dynamic range",
      displayMode: "Display mode",
      glVendor: "GPU vendor",
      glRenderer: "GPU renderer",
      webgl2: "WebGL 2",
      webgpu: "WebGPU",
      maxTexture: "Max texture size",
      online: "Online",
      effectiveType: "Connection type",
      downlink: "Estimated downlink",
      rtt: "Estimated RTT",
      saveData: "Data saver",
      quota: "Storage quota",
      usage: "Storage used",
      localStorage: "localStorage",
      indexedDB: "IndexedDB",
      serviceWorker: "Service Worker",
      geoPerm: "Location",
      notifyPerm: "Notifications",
      cameraPerm: "Camera",
      micPerm: "Microphone",
      sampleRate: "Audio sample rate",
      codecH264: "H.264",
      codecHevc: "HEVC",
      codecVp9: "VP9",
      codecAv1: "AV1",
      codecAac: "AAC",
      codecOpus: "Opus",
      protocol: "Protocol",
      loadTime: "Page load",
      heap: "JS heap",
      unknown: "not exposed",
    },
    kinds: { mobile: "Phone", tablet: "Tablet", desktop: "Desktop" },
    charging: " (charging)",
    perms: { granted: "Granted", denied: "Denied", prompt: "Will ask", unknown: "Unknown" },
    schemes: { dark: "Dark", light: "Light", auto: "System" },
    motions: { reduce: "Reduced", normal: "Normal" },
    contrasts: { more: "More", less: "Less", normal: "Standard" },
    ranges: { high: "High (HDR)", standard: "Standard" },
    pointers: { fine: "Fine (mouse)", coarse: "Coarse (touch)", none: "None" },
    hovers: { yes: "Yes", no: "No" },
    modes: { standalone: "Standalone", fullscreen: "Fullscreen", minimal: "Minimal UI", browser: "Browser tab" },
    copyAll: "Copy all",
    copyJson: "Copy JSON",
    note: "Everything is read on your device and never uploaded. Newer fields — GPU, device memory, connection type, battery — are only exposed by some browsers, so “not exposed” is normal. Resolution is in physical pixels; the viewport excludes scrollbars.",
  },
};

type Copy = (typeof COPY)["zh"];
type GroupId = keyof Copy["groups"];
type Label = keyof Copy["labels"];

const GROUPS: { id: GroupId; rows: Label[] }[] = [
  { id: "screen", rows: ["resolution", "available", "dpr", "colorDepth", "orientation", "orientationAngle"] },
  { id: "viewport", rows: ["inner", "client", "scrollbar"] },
  {
    id: "device",
    rows: [
      "kind",
      "uaBrands",
      "platform",
      "language",
      "languages",
      "timezone",
      "tzOffset",
      "cores",
      "memory",
      "battery",
      "touch",
      "maxTouch",
      "pointer",
      "anyPointer",
      "hover",
      "cookies",
      "doNotTrack",
      "secureContext",
      "ua",
    ],
  },
  {
    id: "display",
    rows: ["colorScheme", "reducedMotion", "contrast", "colorGamut", "dynamicRange", "displayMode"],
  },
  { id: "graphics", rows: ["glVendor", "glRenderer", "webgl2", "webgpu", "maxTexture"] },
  { id: "network", rows: ["online", "effectiveType", "downlink", "rtt", "saveData"] },
  { id: "storage", rows: ["quota", "usage", "localStorage", "indexedDB", "serviceWorker"] },
  { id: "permissions", rows: ["geoPerm", "notifyPerm", "cameraPerm", "micPerm"] },
  {
    id: "media",
    rows: ["sampleRate", "codecH264", "codecHevc", "codecVp9", "codecAv1", "codecAac", "codecOpus"],
  },
  { id: "page", rows: ["protocol", "loadTime", "heap"] },
];

const CODECS: { label: Label; type: string }[] = [
  { label: "codecH264", type: 'video/mp4; codecs="avc1.42E01E"' },
  { label: "codecHevc", type: 'video/mp4; codecs="hvc1.1.6.L93.B0"' },
  { label: "codecVp9", type: 'video/webm; codecs="vp9"' },
  { label: "codecAv1", type: 'video/mp4; codecs="av01.0.05M.08"' },
  { label: "codecAac", type: 'audio/mp4; codecs="mp4a.40.2"' },
  { label: "codecOpus", type: 'audio/webm; codecs="opus"' },
];

const PERMISSIONS: { label: Label; name: string }[] = [
  { label: "geoPerm", name: "geolocation" },
  { label: "notifyPerm", name: "notifications" },
  { label: "cameraPerm", name: "camera" },
  { label: "micPerm", name: "microphone" },
];

interface Connection {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

interface UserAgentData {
  platform?: string;
  mobile?: boolean;
  brands?: UaBrand[];
}

interface Battery {
  level: number;
  charging: boolean;
}

type NavigatorExtras = Navigator & {
  deviceMemory?: number;
  connection?: Connection;
  userAgentData?: UserAgentData;
  getBattery?: () => Promise<Battery>;
};

type Values = Partial<Record<Label, string>>;

const ok = (value: boolean) => (value ? "✓" : "✗");

function media(query: string): boolean {
  return window.matchMedia(query).matches;
}

/**
 * A canvas only hands out one context type, so WebGL 1 and 2 need a probe each.
 * Blocked or software-rendered GPUs simply return null here.
 */
function readGpu(): { vendor?: string; renderer?: string; webgl2: boolean; webgpu: boolean; maxTexture?: number } {
  const info = {
    vendor: undefined as string | undefined,
    renderer: undefined as string | undefined,
    webgl2: false,
    webgpu: "gpu" in navigator,
    maxTexture: undefined as number | undefined,
  };

  try {
    const gl = document.createElement("canvas").getContext("webgl");
    if (gl) {
      const debug = gl.getExtension("WEBGL_debug_renderer_info") as {
        UNMASKED_VENDOR_WEBGL: number;
        UNMASKED_RENDERER_WEBGL: number;
      } | null;
      if (debug) {
        info.vendor = String(gl.getParameter(debug.UNMASKED_VENDOR_WEBGL));
        info.renderer = String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL));
      }
      info.maxTexture = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE));
    }
    info.webgl2 = document.createElement("canvas").getContext("webgl2") !== null;
  } catch {
    // WebGL can be disabled outright; the fields stay blank
  }

  return info;
}

function readCodecs(): Partial<Record<Label, string>> {
  const video = document.createElement("video");
  const out: Partial<Record<Label, string>> = {};
  for (const probe of CODECS) out[probe.label] = ok(video.canPlayType(probe.type) !== "");
  return out;
}

/** Constructing a context is the only way to ask; it is closed straight away */
function readSampleRate(): number | null {
  try {
    if (!window.AudioContext) return null;
    const context = new window.AudioContext();
    const rate = context.sampleRate;
    void context.close();
    return rate;
  } catch {
    return null;
  }
}

type PermissionName_ = "granted" | "denied" | "prompt" | "unknown";

async function readPermission(name: string): Promise<PermissionName_> {
  if (!navigator.permissions?.query) return "unknown";
  try {
    const status = await navigator.permissions.query({ name: name as PermissionName });
    return status.state;
  } catch {
    return "unknown";
  }
}

/** Permission names are localised labels, so the merge needs a typed walk */
function permissionValues(states: readonly (readonly [Label, PermissionName_])[], t: Copy): Values {
  const out: Values = {};
  for (const [label, state] of states) out[label] = t.perms[state];
  return out;
}

/** Probed once: a resize should not write to localStorage on every frame */
let storageSupport: { localStorage: boolean; indexedDB: boolean } | null = null;

function storageProbe(): { localStorage: boolean; indexedDB: boolean } {
  if (storageSupport) return storageSupport;
  let local = false;
  try {
    window.localStorage.setItem("__probe", "1");
    window.localStorage.removeItem("__probe");
    local = true;
  } catch {
    local = false;
  }
  storageSupport = { localStorage: local, indexedDB: "indexedDB" in window };
  return storageSupport;
}

function collectSync(t: Copy): Values {
  const screenInfo = window.screen;
  const root = document.documentElement;
  const nav = navigator as NavigatorExtras;
  const connection = nav.connection;
  const storage = storageProbe();
  const page = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  const heap = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;

  /*
   * `pointer` only describes the primary input; `any-pointer` also reports a
   * touch digitiser the machine keeps around. Splitting them is what makes a
   * "touch supported" reading on a non-touch desktop explainable.
   */
  const pointerKind = (kind: "pointer" | "any-pointer"): string => {
    if (media(`(${kind}: coarse)`)) return t.pointers.coarse;
    if (media(`(${kind}: fine)`)) return t.pointers.fine;
    return t.pointers.none;
  };
  const pointer = pointerKind("pointer");
  const anyPointer = pointerKind("any-pointer");
  const displayMode = media("(display-mode: standalone)")
    ? t.modes.standalone
    : media("(display-mode: fullscreen)")
      ? t.modes.fullscreen
      : media("(display-mode: minimal-ui)")
        ? t.modes.minimal
        : t.modes.browser;

  return {
    resolution: `${screenInfo.width} × ${screenInfo.height}`,
    available: `${screenInfo.availWidth} × ${screenInfo.availHeight}`,
    dpr: String(window.devicePixelRatio),
    colorDepth: `${screenInfo.colorDepth} bit`,
    orientation: screenInfo.orientation?.type ?? t.labels.unknown,
    orientationAngle: `${screenInfo.orientation?.angle ?? 0}°`,
    inner: `${window.innerWidth} × ${window.innerHeight}`,
    client: `${root.clientWidth} × ${root.clientHeight}`,
    scrollbar: `${window.innerWidth - root.clientWidth} px`,
    ua: nav.userAgent,
    uaBrands: pickUaBrand(nav.userAgentData?.brands) ?? t.labels.unknown,
    kind:
      t.kinds[
        deviceKind({
          mobile: nav.userAgentData?.mobile,
          maxTouchPoints: nav.maxTouchPoints,
          userAgent: nav.userAgent,
        })
      ],
    platform: nav.userAgentData?.platform ?? nav.platform ?? t.labels.unknown,
    language: nav.language,
    languages: nav.languages?.join(", ") || t.labels.unknown,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    tzOffset: formatUtcOffset(-new Date().getTimezoneOffset()),
    cores: nav.hardwareConcurrency ? String(nav.hardwareConcurrency) : t.labels.unknown,
    memory: nav.deviceMemory ? `${nav.deviceMemory} GB` : t.labels.unknown,
    touch: ok(nav.maxTouchPoints > 0),
    maxTouch: String(nav.maxTouchPoints ?? 0),
    pointer,
    anyPointer,
    hover: media("(hover: hover)") ? t.hovers.yes : t.hovers.no,
    cookies: ok(nav.cookieEnabled),
    doNotTrack: ok(nav.doNotTrack === "1" || nav.doNotTrack === "yes"),
    secureContext: ok(window.isSecureContext),
    colorScheme: media("(prefers-color-scheme: dark)")
      ? t.schemes.dark
      : media("(prefers-color-scheme: light)")
        ? t.schemes.light
        : t.schemes.auto,
    reducedMotion: media("(prefers-reduced-motion: reduce)") ? t.motions.reduce : t.motions.normal,
    contrast: media("(prefers-contrast: more)")
      ? t.contrasts.more
      : media("(prefers-contrast: less)")
        ? t.contrasts.less
        : t.contrasts.normal,
    colorGamut: media("(color-gamut: rec2020)") ? "Rec. 2020" : media("(color-gamut: p3)") ? "Display P3" : "sRGB",
    dynamicRange: media("(dynamic-range: high)") ? t.ranges.high : t.ranges.standard,
    displayMode,
    online: ok(navigator.onLine),
    effectiveType: connection?.effectiveType ?? t.labels.unknown,
    downlink: connection?.downlink != null ? `${connection.downlink} Mb/s` : t.labels.unknown,
    rtt: connection?.rtt != null ? `${connection.rtt} ms` : t.labels.unknown,
    saveData: connection?.saveData == null ? t.labels.unknown : ok(connection.saveData),
    localStorage: ok(storage.localStorage),
    indexedDB: ok(storage.indexedDB),
    serviceWorker: ok("serviceWorker" in navigator),
    protocol: location.protocol.replace(":", ""),
    loadTime: page && page.loadEventEnd > 0 ? formatDuration(page.loadEventEnd - page.startTime) : t.labels.unknown,
    heap: heap ? formatBytes(heap.usedJSHeapSize) : t.labels.unknown,
  };
}

export function DeviceInfoTool() {
  const t = useCopy(COPY);
  const [values, setValues] = React.useState<Values>({});

  React.useEffect(() => {
    const read = () => setValues((prev) => ({ ...prev, ...collectSync(t) }));
    // Deferred a tick: writing state straight from an effect re-renders in a
    // loop the lint rule quite rightly refuses
    const id = window.setTimeout(read, 0);
    window.addEventListener("resize", read);
    window.addEventListener("orientationchange", read);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("resize", read);
      window.removeEventListener("orientationchange", read);
    };
  }, [t]);

  /* The slow fields — GPU, quotas, permissions, battery — resolve after mount */
  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const gpu = readGpu();
      const codecs = readCodecs();
      const sampleRate = readSampleRate();

      let quota: number | null = null;
      let usage: number | null = null;
      try {
        const estimate = await navigator.storage?.estimate?.();
        quota = estimate?.quota ?? null;
        usage = estimate?.usage ?? null;
      } catch {
        quota = null;
        usage = null;
      }

      let battery: Battery | null = null;
      try {
        const nav = navigator as NavigatorExtras;
        battery = nav.getBattery ? await nav.getBattery() : null;
      } catch {
        battery = null;
      }

      const permissions = await Promise.all(
        PERMISSIONS.map(async (probe) => [probe.label, await readPermission(probe.name)] as const)
      );

      if (cancelled) return;

      setValues((prev) => ({
        ...prev,
        ...codecs,
        glVendor: gpu.vendor ?? t.labels.unknown,
        glRenderer: gpu.renderer ?? t.labels.unknown,
        webgl2: ok(gpu.webgl2),
        webgpu: ok(gpu.webgpu),
        maxTexture: gpu.maxTexture ? `${gpu.maxTexture} px` : t.labels.unknown,
        quota: quota == null ? t.labels.unknown : formatBytes(quota),
        usage: usage == null ? t.labels.unknown : formatBytes(usage),
        ...permissionValues(permissions, t),
        sampleRate: sampleRate ? `${sampleRate} Hz` : t.labels.unknown,
        battery: battery
          ? `${Math.round(battery.level * 100)}%${battery.charging ? t.charging : ""}`
          : t.labels.unknown,
      }));
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const rows = (list: Label[]): { label: Label; value: string }[] =>
    list.map((label) => ({ label, value: values[label] ?? "—" }));

  const text = GROUPS.map((group) => {
    const lines = rows(group.rows).map((row) => `${t.labels[row.label]}: ${row.value}`);
    return [`[${t.groups[group.id]}]`, ...lines].join("\n");
  }).join("\n\n");

  const json = JSON.stringify(
    Object.fromEntries(
      GROUPS.map((group) => [
        t.groups[group.id],
        Object.fromEntries(rows(group.rows).map((row) => [t.labels[row.label], row.value])),
      ])
    ),
    null,
    2
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3">
        <span className="flex items-center gap-2 text-xs font-medium text-foreground-muted">
          <Monitor className="h-3.5 w-3.5" />
          {t.groups.screen}
          <span className="font-mono text-[11px] text-foreground-faint">{values.resolution ?? "—"}</span>
        </span>
        <div className="ml-auto flex items-center gap-2">
          <CopyButton value={json} label={t.copyJson} />
          <CopyButton value={text} label={t.copyAll} />
        </div>
      </div>

      {/* Sections differ a lot in length, so they flow in two columns instead
          of leaving a tall hole under a short one in a grid */}
      <div className="columns-1 gap-3 lg:columns-2">
        {GROUPS.map((group) => (
          <section
            key={group.id}
            className="mb-3 break-inside-avoid overflow-hidden rounded-lg border border-border bg-surface"
          >
            <header className="border-b border-border px-4 py-2 text-xs font-medium text-foreground-muted">
              {t.groups[group.id]}
            </header>
            {rows(group.rows).map((row) => (
              <div
                key={row.label}
                className="flex items-baseline gap-3 border-b border-border px-4 py-2 last:border-b-0"
              >
                <span className="w-32 shrink-0 text-[11px] text-foreground-subtle">{t.labels[row.label]}</span>
                <span className="min-w-0 flex-1 break-all font-mono text-[11.5px] text-foreground">{row.value}</span>
              </div>
            ))}
          </section>
        ))}
      </div>

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}

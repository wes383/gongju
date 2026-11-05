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
  summarizeSupport,
  withFullVersion,
  type FeatureProbe,
  type SupportSummary,
  type UaBrand,
  type UaHighEntropy,
} from "@/lib/device";

const COPY = {
  zh: {
    groups: {
      screen: "屏幕",
      viewport: "视口",
      device: "设备与系统",
      locale: "语言与区域",
      display: "偏好与显示",
      graphics: "图形",
      network: "网络",
      storage: "存储",
      permissions: "权限",
      media: "媒体能力",
      runtime: "运行时与能力",
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
      uaFullVersion: "完整版本",
      kind: "设备类型",
      platform: "平台",
      platformVersion: "系统版本",
      arch: "CPU 架构",
      bitness: "CPU 位数",
      wow64: "32 位子系统",
      model: "设备型号",
      vendor: "浏览器厂商",
      webdriver: "自动化环境",
      language: "语言",
      languages: "首选语言列表",
      timezone: "时区",
      tzOffset: "时区偏移",
      intlCalendar: "日历系统",
      intlNumbering: "数字系统",
      cores: "逻辑 CPU 核数",
      memory: "设备内存",
      battery: "电池",
      touch: "触摸支持",
      maxTouch: "最大触点",
      pointer: "主指针精度",
      anyPointer: "任意指针精度",
      hover: "悬停能力",
      gpc: "全局隐私控制",
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
      glVersion: "WebGL 版本",
      glSl: "着色语言版本",
      webgl2: "WebGL 2",
      webgpu: "WebGPU",
      maxTexture: "最大纹理尺寸",
      glLimits: "WebGL 上限",
      glVertex: "顶点属性",
      glUnits: "纹理单元",
      glBuffer: "渲染缓冲",
      online: "在线状态",
      effectiveType: "网络类型",
      downlink: "下行带宽估算",
      rtt: "往返时延估算",
      saveData: "省流模式",
      quota: "存储配额",
      usage: "已用存储",
      persisted: "存储持久化",
      localStorage: "localStorage",
      indexedDB: "IndexedDB",
      serviceWorker: "Service Worker",
      geoPerm: "定位权限",
      notifyPerm: "通知权限",
      cameraPerm: "摄像头权限",
      micPerm: "麦克风权限",
      sampleRate: "音频采样率",
      audioChannels: "音频通道数",
      audioLatency: "音频输出延迟",
      audioDevices: "音频设备数",
      codecH264: "H.264",
      codecHevc: "HEVC",
      codecVp9: "VP9",
      codecAv1: "AV1",
      codecAac: "AAC",
      codecOpus: "Opus",
      visibility: "页面可见性",
      focus: "窗口焦点",
      protocol: "协议",
      loadTime: "页面加载耗时",
      resourceCount: "资源数量",
      transferred: "资源传输量",
      heap: "JS 堆内存",
      historyLength: "历史记录长度",
      characterSet: "文档编码",
      referrer: "来源页",
      crossOriginIsolated: "跨源隔离",
      wasm: "WebAssembly",
      pdfViewer: "PDF 查看器",
      jsApis: "现代 JS API",
      cssSupport: "CSS 特性",
      peripherals: "外设接口",
      gamepads: "游戏手柄",
      unknown: "未提供",
      none: "无",
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
    states: { visible: "可见", hidden: "隐藏" },
    missing: "缺",
    listSep: "、",
    bits: "位",
    devices: { input: "输入", output: "输出" },
    copyAll: "复制全部",
    copyJson: "复制 JSON",
    note: "全部在本机读取，不会上传。较新的字段（显卡、设备内存、网络类型、电池）只有部分浏览器提供，显示「未提供」属正常；分辨率是物理像素，视口不含滚动条。",
  },
  en: {
    groups: {
      screen: "Screen",
      viewport: "Viewport",
      device: "Device and system",
      locale: "Language and region",
      display: "Preferences and display",
      graphics: "Graphics",
      network: "Network",
      storage: "Storage",
      permissions: "Permissions",
      media: "Media support",
      runtime: "Runtime and capabilities",
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
      uaFullVersion: "Full version",
      kind: "Device type",
      platform: "Platform",
      platformVersion: "OS version",
      arch: "CPU architecture",
      bitness: "CPU bitness",
      wow64: "32-bit subsystem",
      model: "Device model",
      vendor: "Vendor",
      webdriver: "Automation",
      language: "Language",
      languages: "Preferred languages",
      timezone: "Time zone",
      tzOffset: "UTC offset",
      intlCalendar: "Calendar",
      intlNumbering: "Numbering system",
      cores: "Logical CPU cores",
      memory: "Device memory",
      battery: "Battery",
      touch: "Touch support",
      maxTouch: "Max touch points",
      pointer: "Primary pointer",
      anyPointer: "Any pointer",
      hover: "Hover",
      gpc: "Global Privacy Control",
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
      glVersion: "WebGL version",
      glSl: "GLSL version",
      webgl2: "WebGL 2",
      webgpu: "WebGPU",
      maxTexture: "Max texture size",
      glLimits: "WebGL limits",
      glVertex: "vertex attribs",
      glUnits: "texture units",
      glBuffer: "renderbuffer",
      online: "Online",
      effectiveType: "Connection type",
      downlink: "Estimated downlink",
      rtt: "Estimated RTT",
      saveData: "Data saver",
      quota: "Storage quota",
      usage: "Storage used",
      persisted: "Persistent storage",
      localStorage: "localStorage",
      indexedDB: "IndexedDB",
      serviceWorker: "Service Worker",
      geoPerm: "Location",
      notifyPerm: "Notifications",
      cameraPerm: "Camera",
      micPerm: "Microphone",
      sampleRate: "Audio sample rate",
      audioChannels: "Audio channels",
      audioLatency: "Audio latency",
      audioDevices: "Audio devices",
      codecH264: "H.264",
      codecHevc: "HEVC",
      codecVp9: "VP9",
      codecAv1: "AV1",
      codecAac: "AAC",
      codecOpus: "Opus",
      visibility: "Page visibility",
      focus: "Window focus",
      protocol: "Protocol",
      loadTime: "Page load",
      resourceCount: "Resources",
      transferred: "Transferred",
      heap: "JS heap",
      historyLength: "History length",
      characterSet: "Character set",
      referrer: "Referrer",
      crossOriginIsolated: "Cross-origin isolated",
      wasm: "WebAssembly",
      pdfViewer: "PDF viewer",
      jsApis: "Modern JS APIs",
      cssSupport: "CSS features",
      peripherals: "Peripherals",
      gamepads: "Gamepads",
      unknown: "not exposed",
      none: "None",
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
    states: { visible: "Visible", hidden: "Hidden" },
    missing: "missing",
    listSep: ", ",
    bits: "-bit",
    devices: { input: "in", output: "out" },
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
      "platform",
      "platformVersion",
      "arch",
      "bitness",
      "wow64",
      "model",
      "uaBrands",
      "uaFullVersion",
      "vendor",
      "webdriver",
      "cores",
      "memory",
      "battery",
      "touch",
      "maxTouch",
      "pointer",
      "anyPointer",
      "hover",
      "ua",
    ],
  },
  {
    id: "locale",
    rows: ["language", "languages", "timezone", "tzOffset", "intlCalendar", "intlNumbering"],
  },
  {
    id: "display",
    rows: ["colorScheme", "reducedMotion", "contrast", "colorGamut", "dynamicRange", "displayMode"],
  },
  {
    id: "graphics",
    rows: ["glVendor", "glRenderer", "glVersion", "glSl", "webgl2", "webgpu", "maxTexture", "glLimits"],
  },
  { id: "network", rows: ["online", "effectiveType", "downlink", "rtt", "saveData"] },
  { id: "storage", rows: ["quota", "usage", "persisted", "localStorage", "indexedDB", "serviceWorker"] },
  { id: "permissions", rows: ["geoPerm", "notifyPerm", "cameraPerm", "micPerm"] },
  {
    id: "media",
    rows: [
      "sampleRate",
      "audioChannels",
      "audioLatency",
      "audioDevices",
      "codecH264",
      "codecHevc",
      "codecVp9",
      "codecAv1",
      "codecAac",
      "codecOpus",
    ],
  },
  {
    id: "runtime",
    rows: [
      "gpc",
      "cookies",
      "doNotTrack",
      "secureContext",
      "crossOriginIsolated",
      "wasm",
      "pdfViewer",
      "jsApis",
      "cssSupport",
      "peripherals",
      "gamepads",
    ],
  },
  {
    id: "page",
    rows: [
      "visibility",
      "focus",
      "protocol",
      "loadTime",
      "resourceCount",
      "transferred",
      "heap",
      "historyLength",
      "characterSet",
      "referrer",
    ],
  },
];

const CODECS: { label: Label; type: string }[] = [
  { label: "codecH264", type: 'video/mp4; codecs="avc1.42E01E"' },
  { label: "codecHevc", type: 'video/mp4; codecs="hvc1.1.6.L93.B0"' },
  { label: "codecVp9", type: 'video/webm; codecs="vp9"' },
  { label: "codecAv1", type: 'video/mp4; codecs="av01.0.05M.08"' },
  { label: "codecAac", type: 'audio/mp4; codecs="mp4a.40.2"' },
  { label: "codecOpus", type: 'audio/webm; codecs="opus"' },
];

/** Each entry is the condition handed to `CSS.supports` */
const CSS_QUERIES: [string, string][] = [
  [":has()", "selector(:has(*))"],
  ["Container queries", "container-type: inline-size"],
  ["Nesting", "selector(&)"],
  ["color-mix()", "color: color-mix(in srgb, red, blue)"],
  ["backdrop-filter", "backdrop-filter: blur(1px)"],
  ["Subgrid", "grid-template-columns: subgrid"],
  ["dvh", "height: 100dvh"],
  ["oklch()", "color: oklch(50% 0.1 200)"],
  ["text-wrap: balance", "text-wrap: balance"],
  ["aspect-ratio", "aspect-ratio: 1"],
];

/**
 * A representative slice of newer language and platform APIs. Feature tests
 * rather than version sniffing: a browser either has the function or it does
 * not, whatever it claims to be.
 */
const JS_PROBES: [string, () => boolean][] = [
  ["structuredClone", () => typeof structuredClone === "function"],
  ["Object.hasOwn", () => typeof Object.hasOwn === "function"],
  ["Array.at", () => typeof [].at === "function"],
  ["Array.findLast", () => typeof [].findLast === "function"],
  ["AbortSignal.timeout", () => typeof AbortSignal.timeout === "function"],
  [
    "Intl.Segmenter",
    () => typeof (Intl as unknown as { Segmenter?: unknown }).Segmenter === "function",
  ],
  ["URL.canParse", () => typeof (URL as unknown as { canParse?: unknown }).canParse === "function"],
  [
    "Promise.withResolvers",
    () => typeof (Promise as unknown as { withResolvers?: unknown }).withResolvers === "function",
  ],
];

const PERIPHERAL_KEYS = ["bluetooth", "usb", "serial", "hid", "nfc"];

/** "8 / 10 · missing Nesting, Subgrid" — passes first, then what is absent */
function supportText(summary: SupportSummary, t: Copy): string {
  const head = `${summary.supported} / ${summary.total}`;
  return summary.missing.length > 0 ? `${head} · ${t.missing} ${summary.missing.join(t.listSep)}` : head;
}

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
  getHighEntropyValues?: (hints: string[]) => Promise<UaHighEntropy>;
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
  globalPrivacyControl?: boolean;
};

type Values = Partial<Record<Label, string>>;

const ok = (value: boolean) => (value ? "✓" : "✗");

function media(query: string): boolean {
  return window.matchMedia(query).matches;
}

interface GpuInfo {
  vendor?: string;
  renderer?: string;
  version?: string;
  glsl?: string;
  webgl2: boolean;
  webgpu: boolean;
  maxTexture?: number;
  vertexAttribs?: number;
  textureUnits?: number;
  renderbuffer?: number;
}

/**
 * A canvas only hands out one context type, so WebGL 1 and 2 need a probe each.
 * Blocked or software-rendered GPUs simply return null here.
 */
function readGpu(): GpuInfo {
  const info: GpuInfo = {
    webgl2: false,
    webgpu: "gpu" in navigator,
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
      info.version = String(gl.getParameter(gl.VERSION));
      info.glsl = String(gl.getParameter(gl.SHADING_LANGUAGE_VERSION));
      info.maxTexture = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE));
      info.vertexAttribs = Number(gl.getParameter(gl.MAX_VERTEX_ATTRIBS));
      info.textureUnits = Number(gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS));
      info.renderbuffer = Number(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE));
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

interface AudioInfo {
  sampleRate: number;
  channels?: number;
  latency?: number;
}

/** Constructing a context is the only way to ask; it is closed straight away */
function readAudio(): AudioInfo | null {
  try {
    if (!window.AudioContext) return null;
    const context = new window.AudioContext();
    const info: AudioInfo = {
      sampleRate: context.sampleRate,
      channels: context.destination?.maxChannelCount,
      // `outputLatency` is the honest figure; `baseLatency` is the graph only
      latency: (context as AudioContext & { outputLatency?: number }).outputLatency || context.baseLatency,
    };
    void context.close();
    return info;
  } catch {
    return null;
  }
}

/** Device counts only: labels need a permission prompt, and they are private */
async function readAudioDevices(): Promise<{ inputs: number; outputs: number } | null> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return {
      inputs: devices.filter((device) => device.kind === "audioinput").length,
      outputs: devices.filter((device) => device.kind === "audiooutput").length,
    };
  } catch {
    return null;
  }
}

async function readHighEntropy(): Promise<UaHighEntropy | null> {
  const hints = (navigator as NavigatorExtras).userAgentData?.getHighEntropyValues;
  if (!hints) return null;
  try {
    return await hints([
      "architecture",
      "bitness",
      "platformVersion",
      "uaFullVersion",
      "fullVersionList",
      "model",
      "wow64",
    ]);
  } catch {
    return null;
  }
}

interface Capabilities {
  css: SupportSummary;
  js: SupportSummary;
  peripherals: string[];
}

/**
 * Feature support is fixed for the lifetime of the page, so the probes run once
 * even though the surrounding values are recollected on every resize.
 */
let capabilityCache: Capabilities | null = null;

function readCapabilities(): Capabilities {
  if (capabilityCache) return capabilityCache;

  const css: FeatureProbe[] = CSS_QUERIES.map(([name, query]) => ({
    name,
    supported: typeof CSS !== "undefined" && CSS.supports(query),
  }));
  const js: FeatureProbe[] = JS_PROBES.map(([name, test]) => ({ name, supported: test() }));
  const peripherals = PERIPHERAL_KEYS.filter((key) => key in navigator).map(
    (key) => key.charAt(0).toUpperCase() + key.slice(1)
  );

  capabilityCache = {
    css: summarizeSupport(css),
    js: summarizeSupport(js),
    peripherals,
  };
  return capabilityCache;
}

function readResources(): { count: number; bytes: number } {
  const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
  const bytes = entries.reduce((total, entry) => total + (entry.transferSize || 0), 0);
  return { count: entries.length, bytes };
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
  const capabilities = readCapabilities();
  const resources = readResources();
  const intl = Intl.DateTimeFormat().resolvedOptions();

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
    vendor: nav.vendor || t.labels.unknown,
    webdriver: ok(nav.webdriver),
    gpc: nav.globalPrivacyControl === undefined ? t.labels.unknown : ok(nav.globalPrivacyControl),
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
    timezone: intl.timeZone,
    tzOffset: formatUtcOffset(-new Date().getTimezoneOffset()),
    intlCalendar: intl.calendar ?? t.labels.unknown,
    intlNumbering: intl.numberingSystem ?? t.labels.unknown,
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
    visibility: document.visibilityState === "hidden" ? t.states.hidden : t.states.visible,
    focus: ok(document.hasFocus()),
    protocol: location.protocol.replace(":", ""),
    loadTime: page && page.loadEventEnd > 0 ? formatDuration(page.loadEventEnd - page.startTime) : t.labels.unknown,
    resourceCount: String(resources.count),
    transferred: resources.bytes > 0 ? formatBytes(resources.bytes) : t.labels.unknown,
    heap: heap ? formatBytes(heap.usedJSHeapSize) : t.labels.unknown,
    historyLength: String(window.history.length),
    characterSet: document.characterSet,
    referrer: document.referrer || t.labels.none,
    crossOriginIsolated: ok(window.crossOriginIsolated),
    wasm: ok(typeof WebAssembly === "object" && typeof WebAssembly.instantiate === "function"),
    pdfViewer: "pdfViewerEnabled" in nav ? ok(nav.pdfViewerEnabled) : t.labels.unknown,
    jsApis: supportText(capabilities.js, t),
    cssSupport: supportText(capabilities.css, t),
    peripherals:
      capabilities.peripherals.length > 0 ? capabilities.peripherals.join(t.listSep) : t.labels.none,
    gamepads: String(navigator.getGamepads?.().filter(Boolean).length ?? 0),
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
    // Visibility and focus are read too, so they refresh when the tab moves
    window.addEventListener("visibilitychange", read);
    window.addEventListener("focus", read);
    window.addEventListener("blur", read);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("resize", read);
      window.removeEventListener("orientationchange", read);
      window.removeEventListener("visibilitychange", read);
      window.removeEventListener("focus", read);
      window.removeEventListener("blur", read);
    };
  }, [t]);

  /* The slow fields — GPU, quotas, permissions, battery — resolve after mount */
  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const gpu = readGpu();
      const codecs = readCodecs();
      const audio = readAudio();

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

      const high = await readHighEntropy();
      const audioDevices = await readAudioDevices();

      let persisted: boolean | null = null;
      try {
        persisted = (await navigator.storage?.persisted?.()) ?? null;
      } catch {
        persisted = null;
      }

      if (cancelled) return;

      setValues((prev) => ({
        ...prev,
        ...codecs,
        glVendor: gpu.vendor ?? t.labels.unknown,
        glRenderer: gpu.renderer ?? t.labels.unknown,
        glVersion: gpu.version ?? t.labels.unknown,
        glSl: gpu.glsl ?? t.labels.unknown,
        webgl2: ok(gpu.webgl2),
        webgpu: ok(gpu.webgpu),
        maxTexture: gpu.maxTexture ? `${gpu.maxTexture} px` : t.labels.unknown,
        glLimits:
          gpu.vertexAttribs == null
            ? t.labels.unknown
            : `${t.labels.glVertex} ${gpu.vertexAttribs} · ${t.labels.glUnits} ${gpu.textureUnits} · ${t.labels.glBuffer} ${gpu.renderbuffer}`,
        quota: quota == null ? t.labels.unknown : formatBytes(quota),
        usage: usage == null ? t.labels.unknown : formatBytes(usage),
        ...permissionValues(permissions, t),
        sampleRate: audio ? `${audio.sampleRate} Hz` : t.labels.unknown,
        audioChannels: audio?.channels ? String(audio.channels) : t.labels.unknown,
        audioLatency: audio?.latency != null ? formatDuration(audio.latency * 1000) : t.labels.unknown,
        audioDevices: audioDevices
          ? `${t.devices.input} ${audioDevices.inputs} · ${t.devices.output} ${audioDevices.outputs}`
          : t.labels.unknown,
        persisted: persisted == null ? t.labels.unknown : ok(persisted),
        platformVersion: high?.platformVersion || t.labels.unknown,
        arch: high?.architecture || t.labels.unknown,
        bitness: high?.bitness ? `${high.bitness}${t.bits}` : t.labels.unknown,
        wow64: high?.wow64 == null ? t.labels.unknown : ok(high.wow64),
        model: high?.model || t.labels.unknown,
        uaFullVersion: high
          ? (withFullVersion((navigator as NavigatorExtras).userAgentData?.brands, high.uaFullVersion) ??
            t.labels.unknown)
          : t.labels.unknown,
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

"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Database,
  KeyRound,
  Laptop,
  MessagesSquare,
  ShieldCheck,
} from "lucide-react";
import { LanguageToggle } from "@/components/site/language-toggle";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { useCopy, useT } from "@/components/locale-provider";
import { useDocumentTitle } from "@/components/use-document-title";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const SECTION_IDS = [
  "overview",
  "collection",
  "storage",
  "permissions",
  "third-party",
  "security",
  "children",
  "changes",
  "contact",
] as const;

type SectionId = (typeof SECTION_IDS)[number];

interface SummaryCard {
  title: string;
  description: string;
}

interface StorageRow {
  key: string;
  purpose: string;
  detail: string;
}

interface PermissionRow {
  name: string;
  scene: string;
  detail: string;
}

interface PrivacyCopy {
  title: string;
  lede: string;
  effectiveLabel: string;
  effectiveDate: string;
  version: string;
  applies: string;
  toc: string;
  summaryTitle: string;
  summary: SummaryCard[];
  sections: Record<SectionId, string>;
  overview: string[];
  collection: {
    intro: string;
    bullets: string[];
    toolData: string;
    hosting: string;
  };
  storage: {
    intro: string;
    headers: [string, string, string];
    rows: StorageRow[];
    note: string;
  };
  permissions: {
    intro: string;
    headers: [string, string, string];
    rows: PermissionRow[];
    note: string;
  };
  thirdParty: string[];
  security: string[];
  children: string[];
  changes: string[];
  contact: {
    intro: string;
    linkLabel: string;
    linkHint: string;
    outro: string;
  };
}

const COPY: Record<Locale, PrivacyCopy> = {
  zh: {
    title: "隐私政策",
    lede: "GongJu（以下简称“本站”）是一个纯浏览器端运行的在线工具箱。本政策说明本站如何处理信息：哪些数据始终留在你的设备上，哪些有限的信息会经过托管服务，以及你对数据拥有的控制权。",
    effectiveLabel: "生效日期",
    effectiveDate: "2026-11-11",
    version: "版本 1.0",
    applies: "适用于本站全部页面与工具",
    toc: "本页目录",
    summaryTitle: "核心承诺",
    summary: [
      {
        title: "零账号、零追踪",
        description: "无需注册或登录；不加载统计脚本，不使用 Cookie，不投放广告，不做设备指纹识别。",
      },
      {
        title: "数据不出本机",
        description: "输入的文本、上传的文件与图片、音视频全部在浏览器内完成处理，不会发送到任何服务器。",
      },
      {
        title: "本地偏好存储",
        description: "仅使用 localStorage 保存界面偏好、笔记与剪贴板历史，全部由你掌控，可随时清除。",
      },
      {
        title: "权限按需申请",
        description: "摄像头与剪贴板仅在对应工具中、经你明确同意后使用，画面与内容只在本机处理。",
      },
    ],
    sections: {
      overview: "引言与适用范围",
      collection: "我们收集与不收集的信息",
      storage: "本地存储明细",
      permissions: "设备权限",
      "third-party": "第三方服务与外部链接",
      security: "数据安全",
      children: "未成年人",
      changes: "政策更新",
      contact: "联系我们",
    },
    overview: [
      "本政策适用于你访问和使用 GongJu 在线工具箱（包括全部工具页面）的行为。本站作为开源项目维护，不设账号体系，也不要求注册或登录。",
      "本站的核心设计原则是“本地优先”：工具的全部计算在你的浏览器中完成。除加载页面本身所需的静态资源外，本站不向任何服务器发送你的数据。",
      "使用本站即表示你已阅读并理解本政策。如果你不同意本政策的任何内容，请停止使用本站。",
    ],
    collection: {
      intro: "本站不主动收集任何可识别你身份的信息。具体而言：",
      bullets: [
        "不加载任何第三方统计、分析或广告脚本；",
        "不使用 Cookie、像素标签或设备指纹技术追踪你；",
        "不记录你在工具中输入的文本、上传的文件内容或处理结果；",
        "不出售、出租或与任何第三方共享你的数据——因为我们并不持有它。",
      ],
      toolData: "你在工具中处理的文本、文件、图片、音频与视频仅存在于浏览器内存中，用于当次计算；关闭或刷新页面后即消失。只有当你主动使用“记事本”或“剪贴板历史”时，内容才会按下文所述保存在本机。",
      hosting: "需要说明的例外是托管层：当你访问本站时，托管服务商与内容分发网络（CDN）会按其标准做法记录访问日志，其中可能包含你的 IP 地址、浏览器标识（User-Agent）、请求时间与所访问的页面路径。这类日志用于服务的安全防护与故障排查，本站不会将其用于画像、追踪或广告。",
    },
    storage: {
      intro: "本站不使用 Cookie。以下信息仅通过浏览器 localStorage 保存在你的设备上，不会同步、不会上传：",
      headers: ["键名", "用途", "内容与保存期限"],
      rows: [
        {
          key: "gongju-locale",
          purpose: "界面语言",
          detail: "记录中文 / English 选择；保存至你清除站点数据为止。",
        },
        {
          key: "theme",
          purpose: "外观主题",
          detail: "记录浅色 / 深色 / 跟随系统；保存至你清除站点数据为止。",
        },
        {
          key: "orkest-high-contrast",
          purpose: "高对比度",
          detail: "记录高对比度开关状态；保存至你清除站点数据为止。",
        },
        {
          key: "gongju-view",
          purpose: "首页视图",
          detail: "记录卡片 / 列表布局偏好；保存至你清除站点数据为止。",
        },
        {
          key: "gongju.notes.v1",
          purpose: "记事本",
          detail: "你主动保存的笔记内容；由你增删，可在工具内一键清空。",
        },
        {
          key: "gongju.clipboard.v1",
          purpose: "剪贴板历史",
          detail: "你在本站复制或粘贴的文本，最多保留 50 条；可在工具内一键清空。",
        },
      ],
      note: "清除方式：在对应工具内点击“清空”，或在浏览器设置中删除本站的站点数据。清除后不可恢复，重要内容请先导出。localStorage 按域名隔离，其他网站无法读取这些键值，它们也不参与跨站追踪。",
    },
    permissions: {
      intro: "本站仅在以下场景、经浏览器弹窗征得你同意后使用相应权限。拒绝授权不影响其他工具的正常使用：",
      headers: ["权限", "使用场景", "处理方式"],
      rows: [
        {
          name: "摄像头",
          scene: "二维码识别（可选开启摄像头扫码）",
          detail: "画面仅用于本机实时解码，不录制、不保存、不上传；离开该工具即停止调用。",
        },
        {
          name: "剪贴板读取",
          scene: "剪贴板历史（点击“读取剪贴板”时）",
          detail: "读取的文本仅保存在本机 localStorage，可随时清空。",
        },
        {
          name: "剪贴板写入",
          scene: "各工具的“复制”按钮",
          detail: "仅在你点击复制时，将结果文本写入系统剪贴板。",
        },
      ],
      note: "本站不请求麦克风、地理位置、通知等其他权限。已授予的权限可随时在浏览器的站点设置中撤销。",
    },
    thirdParty: [
      "本站不集成任何第三方 SDK、统计服务、广告网络或社交插件。页面字体在构建时下载并随站点自托管，运行时不会向字体服务商发起请求。",
      "本站包含指向外部网站（如 GitHub 项目仓库）的链接。点击后你将离开本站，外部网站的数据实践由其自身隐私政策约束，本站对其内容与实践不承担责任。",
    ],
    security: [
      "由于处理全部在本地完成，你的数据不经过网络传输，从根本上避免了传输与服务器存储环节的泄露风险；本站为纯静态站点，不维护用户数据库，因此不存在服务器端的个人数据泄露面。",
      "加密类工具（如 AES-GCM 文本加密、文件加密）使用浏览器原生 Web Crypto API 实现标准算法。密码与密钥仅存在于你的设备，本站无法获取，也无法替你找回遗忘的密码——一旦遗忘，加密内容将无法恢复。",
      "在共用设备上使用后，建议清除本站的站点数据，避免他人看到你的笔记与剪贴板历史。",
    ],
    children: [
      "本站面向一般公众提供工具服务，不面向未成年人定向收集任何信息（事实上本站不收集任何用户信息）。未成年人应在监护人指导下使用本站，加密与文件处理等操作请在监护人知情下进行。",
    ],
    changes: [
      "本政策自页面顶部所示生效日期起适用。若本站的功能或数据实践发生变化（例如新增需要联网的功能），我们会更新本政策并在本页注明新的生效日期，重大变更将以显著方式提示。",
      "我们建议你定期查看本页以了解最新实践。继续使用本站即视为接受更新后的政策。",
    ],
    contact: {
      intro: "如对本政策或你的数据有任何疑问、意见或投诉，可通过 GitHub Issues 与我们联系（中文或英文均可）：",
      linkLabel: "GitHub Issues · wes383/gongju",
      linkHint: "提交隐私相关的问题或建议",
      outro: "我们会在合理时间内回复。由于本站不持有你的个人数据，我们无法执行“查询或删除服务器端个人数据”类请求——你的数据始终由你在本机自行管理。",
    },
  },
  en: {
    title: "Privacy Policy",
    lede: "GongJu (the “Site”) is an online toolbox that runs entirely in your browser. This policy explains how the Site handles information: what stays on your device, the limited information that passes through the hosting service, and the control you have over your data.",
    effectiveLabel: "Effective",
    effectiveDate: "2026-11-11",
    version: "Version 1.0",
    applies: "Applies to every page and tool on this Site",
    toc: "On this page",
    summaryTitle: "Our core commitments",
    summary: [
      {
        title: "No accounts, no tracking",
        description: "No sign-up or login; no analytics scripts, no cookies, no ads and no device fingerprinting.",
      },
      {
        title: "Data stays on your device",
        description: "Text, uploaded files, images, audio and video are processed inside your browser and never sent to any server.",
      },
      {
        title: "Local preferences only",
        description: "localStorage keeps interface preferences, notes and clipboard history — all under your control and erasable at any time.",
      },
      {
        title: "Permissions on demand",
        description: "Camera and clipboard are used only inside the relevant tools, only with your explicit consent, and only on your device.",
      },
    ],
    sections: {
      overview: "Introduction & Scope",
      collection: "What We Do and Do Not Collect",
      storage: "Local Storage Details",
      permissions: "Device Permissions",
      "third-party": "Third Parties & External Links",
      security: "Data Security",
      children: "Children",
      changes: "Changes to This Policy",
      contact: "Contact Us",
    },
    overview: [
      "This policy applies to your access to and use of the GongJu online toolbox, including every tool page. The Site is maintained as an open-source project; there is no account system, and no registration or login is required.",
      "The Site is built on a local-first principle: every computation runs in your browser. Apart from the static assets needed to load the pages themselves, the Site sends none of your data to any server.",
      "By using the Site you confirm that you have read and understood this policy. If you disagree with any part of it, please stop using the Site.",
    ],
    collection: {
      intro: "The Site does not actively collect any information that identifies you. Specifically:",
      bullets: [
        "No third-party analytics, measurement or advertising scripts are loaded;",
        "No cookies, pixel tags or device-fingerprinting techniques are used to track you;",
        "No text you enter, file you upload or result you produce is recorded;",
        "We do not sell, rent or share your data with any third party — because we never hold it.",
      ],
      toolData: "Text, files, images, audio and video you work with exist only in browser memory for the duration of the computation and disappear when the page is closed or reloaded. Content is kept on your device only when you deliberately use the Notepad or Clipboard History tools, as described below.",
      hosting: "One exception must be stated honestly: the hosting layer. When you visit the Site, the hosting provider and content delivery network (CDN) keep standard access logs, which may include your IP address, browser identifier (User-Agent), request time and the page path requested. Such logs serve security and troubleshooting; the Site does not use them for profiling, tracking or advertising.",
    },
    storage: {
      intro: "The Site uses no cookies. The following items are kept on your device through browser localStorage only — never synced, never uploaded:",
      headers: ["Key", "Purpose", "Content & retention"],
      rows: [
        {
          key: "gongju-locale",
          purpose: "Interface language",
          detail: "Stores your Chinese / English choice until you clear site data.",
        },
        {
          key: "theme",
          purpose: "Appearance",
          detail: "Stores light / dark / system preference until you clear site data.",
        },
        {
          key: "orkest-high-contrast",
          purpose: "High contrast",
          detail: "Stores the high-contrast toggle until you clear site data.",
        },
        {
          key: "gongju-view",
          purpose: "Home layout",
          detail: "Stores the card / list layout preference until you clear site data.",
        },
        {
          key: "gongju.notes.v1",
          purpose: "Notepad",
          detail: "Notes you deliberately save; you add and delete them, and can clear them all inside the tool.",
        },
        {
          key: "gongju.clipboard.v1",
          purpose: "Clipboard history",
          detail: "Text you copy or paste on this Site, up to 50 entries; can be cleared inside the tool.",
        },
      ],
      note: "How to erase: use the Clear button inside the relevant tool, or delete this Site's data in your browser settings. Erasure is irreversible, so export anything important first. localStorage is isolated per origin: other websites cannot read these keys, and they play no part in cross-site tracking.",
    },
    permissions: {
      intro: "The Site uses the following permissions only in these scenarios and only after the browser has asked for your consent. Declining a permission does not affect any other tool:",
      headers: ["Permission", "Where it is used", "How it is handled"],
      rows: [
        {
          name: "Camera",
          scene: "QR Code Reader (optional live scanning)",
          detail: "Frames are decoded locally in real time; nothing is recorded, stored or uploaded, and the camera stops when you leave the tool.",
        },
        {
          name: "Clipboard read",
          scene: "Clipboard History (when you press “Read clipboard”)",
          detail: "The text read is kept only in localStorage on your device and can be cleared at any time.",
        },
        {
          name: "Clipboard write",
          scene: "The Copy button in every tool",
          detail: "Result text is written to the system clipboard only when you click Copy.",
        },
      ],
      note: "The Site requests no other permissions such as microphone, geolocation or notifications. Any permission you have granted can be revoked at any time in your browser's site settings.",
    },
    thirdParty: [
      "The Site integrates no third-party SDKs, analytics services, ad networks or social plugins. Fonts are downloaded at build time and self-hosted with the Site, so no requests are made to font providers at runtime.",
      "The Site contains links to external websites, such as the GitHub project repository. Once you click, you leave the Site; those websites' data practices are governed by their own privacy policies, and the Site is not responsible for their content or practices.",
    ],
    security: [
      "Because all processing happens locally, your data never crosses the network, which removes the transmission and server-storage exposure by design. The Site is fully static and keeps no user database, so there is no server-side personal data to breach.",
      "Encryption tools (such as AES-GCM text encryption and file encryption) implement standard algorithms through the browser's native Web Crypto API. Passwords and keys exist only on your device; the Site cannot access them and cannot recover a forgotten password — if you forget it, the encrypted content is unrecoverable.",
      "After using the Site on a shared device, consider clearing its site data so others cannot see your notes or clipboard history.",
    ],
    children: [
      "The Site provides tools to the general public and does not knowingly collect any information from children (in fact, it collects no user information at all). Minors should use the Site under the guidance of a guardian, and encryption or file-handling operations should be carried out with a guardian's knowledge.",
    ],
    changes: [
      "This policy applies from the effective date shown at the top of this page. If the Site's features or data practices change — for example, a feature that requires network access is added — we will update this policy and show the new effective date here, with prominent notice for material changes.",
      "We recommend reviewing this page periodically. Continued use of the Site after an update constitutes acceptance of the revised policy.",
    ],
    contact: {
      intro: "For any question, comment or complaint about this policy or your data, reach us through GitHub Issues (Chinese or English both welcome):",
      linkLabel: "GitHub Issues · wes383/gongju",
      linkHint: "Open a privacy-related question or suggestion",
      outro: "We will respond within a reasonable time. Because the Site holds none of your personal data, we cannot fulfil requests to “look up or delete server-side personal data” — your data is always managed by you, on your own device.",
    },
  },
};

const SUMMARY_ICONS = [ShieldCheck, Laptop, Database, KeyRound];
const SUMMARY_TONES = [
  "border-green-border bg-green-soft text-green-fg",
  "border-blue-border bg-blue-soft text-blue-fg",
  "border-yellow-border bg-yellow-soft text-yellow-fg",
  "border-orange-border bg-orange-soft text-orange-fg",
];

const BODY_TEXT = "text-sm leading-relaxed text-foreground-muted";

function Section({
  id,
  index,
  title,
  children,
}: {
  id: SectionId;
  index: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="flex scroll-mt-6 flex-col gap-3">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-xs text-foreground-faint">
          {String(index + 1).padStart(2, "0")}
        </span>
        <h2 className="font-display text-base font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item} className={cn("flex gap-2.5", BODY_TEXT)}>
          <span
            aria-hidden="true"
            className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-foreground-faint"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function DataTable({
  headers,
  rows,
  monoFirst,
}: {
  headers: [string, string, string];
  rows: [string, string, string][];
  monoFirst?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full min-w-[560px] border-collapse text-left text-sm">
        <thead>
          <tr className="bg-muted">
            {headers.map((h) => (
              <th
                key={h}
                scope="col"
                className="px-4 py-2.5 text-xs font-semibold text-foreground-muted"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]} className="border-t border-border align-top">
              <td
                className={cn(
                  "px-4 py-3 font-medium text-foreground",
                  monoFirst && "font-mono text-xs break-all"
                )}
              >
                {row[0]}
              </td>
              <td className="px-4 py-3 text-foreground-muted">{row[1]}</td>
              <td className={cn("px-4 py-3", BODY_TEXT)}>{row[2]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PrivacyContent() {
  const copy = useCopy(COPY);
  const t = useT();
  const [active, setActive] = React.useState<SectionId>("overview");

  useDocumentTitle(`${copy.title} · GongJu`);

  // Highlight the section currently in view in the sticky table of contents
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id as SectionId);
        }
      },
      { rootMargin: "-15% 0px -75% 0px" }
    );
    for (const id of SECTION_IDS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div className="mx-auto w-full max-w-[1080px] px-5 py-10 sm:py-14">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors duration-base ease-out hover:bg-hover-bg"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.backHome}
        </Link>
        <span className="h-4 w-px shrink-0 bg-border" aria-hidden="true" />
        <span className="truncate font-display text-sm font-semibold text-foreground">
          {copy.title}
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <LanguageToggle size="icon" className="h-9 w-9" />
          <ThemeToggle size="icon" className="h-9 w-9" />
        </div>
      </div>

      <header className="mt-10 flex flex-col gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-muted text-foreground">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
          {copy.title}
        </h1>
        <p className={cn("max-w-[720px]", BODY_TEXT)}>{copy.lede}</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 font-mono text-[11px] text-foreground-muted">
            {copy.effectiveLabel} {copy.effectiveDate}
          </span>
          <span className="inline-flex items-center rounded-full border border-border bg-surface px-3 py-1 font-mono text-[11px] text-foreground-muted">
            {copy.version}
          </span>
          <span className="inline-flex items-center rounded-full border border-border bg-surface px-3 py-1 text-[11px] text-foreground-muted">
            {copy.applies}
          </span>
        </div>
      </header>

      <div className="mt-8">
        <h2 className="text-xs font-semibold tracking-wide text-foreground-subtle">
          {copy.summaryTitle}
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {copy.summary.map((card, i) => {
            const Icon = SUMMARY_ICONS[i];
            return (
              <div
                key={card.title}
                className="flex flex-col gap-2.5 rounded-xl border border-border bg-surface p-4"
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg border",
                    SUMMARY_TONES[i]
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <p className="text-sm font-semibold text-foreground">{card.title}</p>
                <p className="text-xs leading-relaxed text-foreground-muted">
                  {card.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-10 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
        <aside className="mb-8 lg:mb-0">
          <nav
            aria-label={copy.toc}
            className="rounded-xl border border-border bg-surface p-3 lg:sticky lg:top-6"
          >
            <p className="px-2 pb-2 text-xs font-semibold text-foreground-subtle">{copy.toc}</p>
            <div className="grid grid-cols-2 gap-0.5 sm:grid-cols-3 lg:grid-cols-1">
              {SECTION_IDS.map((id, i) => (
                <a
                  key={id}
                  href={`#${id}`}
                  aria-current={active === id ? "location" : undefined}
                  className={cn(
                    "flex items-baseline gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors duration-base ease-out",
                    active === id
                      ? "bg-accent-muted font-medium text-foreground"
                      : "text-foreground-muted hover:bg-hover-bg hover:text-foreground"
                  )}
                >
                  <span className="font-mono text-[10px] text-foreground-faint">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0">{copy.sections[id]}</span>
                </a>
              ))}
            </div>
          </nav>
        </aside>

        <article className="flex min-w-0 flex-col gap-10">
          <Section id="overview" index={0} title={copy.sections.overview}>
            {copy.overview.map((p) => (
              <p key={p} className={BODY_TEXT}>
                {p}
              </p>
            ))}
          </Section>

          <Section id="collection" index={1} title={copy.sections.collection}>
            <p className={BODY_TEXT}>{copy.collection.intro}</p>
            <BulletList items={copy.collection.bullets} />
            <p className={BODY_TEXT}>{copy.collection.toolData}</p>
            <div className="rounded-xl border border-yellow-border bg-yellow-soft p-4">
              <p className="text-sm leading-relaxed text-yellow-fg">{copy.collection.hosting}</p>
            </div>
          </Section>

          <Section id="storage" index={2} title={copy.sections.storage}>
            <p className={BODY_TEXT}>{copy.storage.intro}</p>
            <DataTable
              headers={copy.storage.headers}
              rows={copy.storage.rows.map((r) => [r.key, r.purpose, r.detail])}
              monoFirst
            />
            <p className={BODY_TEXT}>{copy.storage.note}</p>
          </Section>

          <Section id="permissions" index={3} title={copy.sections.permissions}>
            <p className={BODY_TEXT}>{copy.permissions.intro}</p>
            <DataTable
              headers={copy.permissions.headers}
              rows={copy.permissions.rows.map((r) => [r.name, r.scene, r.detail])}
            />
            <p className={BODY_TEXT}>{copy.permissions.note}</p>
          </Section>

          <Section id="third-party" index={4} title={copy.sections["third-party"]}>
            {copy.thirdParty.map((p) => (
              <p key={p} className={BODY_TEXT}>
                {p}
              </p>
            ))}
          </Section>

          <Section id="security" index={5} title={copy.sections.security}>
            {copy.security.map((p) => (
              <p key={p} className={BODY_TEXT}>
                {p}
              </p>
            ))}
          </Section>

          <Section id="children" index={6} title={copy.sections.children}>
            {copy.children.map((p) => (
              <p key={p} className={BODY_TEXT}>
                {p}
              </p>
            ))}
          </Section>

          <Section id="changes" index={7} title={copy.sections.changes}>
            {copy.changes.map((p) => (
              <p key={p} className={BODY_TEXT}>
                {p}
              </p>
            ))}
          </Section>

          <Section id="contact" index={8} title={copy.sections.contact}>
            <p className={BODY_TEXT}>{copy.contact.intro}</p>
            <a
              href="https://github.com/wes383/gongju/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-colors duration-base ease-out hover:bg-hover-bg"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-muted text-foreground">
                <MessagesSquare className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">
                  {copy.contact.linkLabel}
                </span>
                <span className="block text-xs text-foreground-muted">
                  {copy.contact.linkHint}
                </span>
              </span>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-foreground-faint transition-colors group-hover:text-foreground" />
            </a>
            <p className={BODY_TEXT}>{copy.contact.outro}</p>
          </Section>
        </article>
      </div>

      <footer className="mt-14 flex items-center justify-between border-t border-border pt-6 text-xs text-foreground-subtle">
        <span>GongJu · {copy.effectiveDate}</span>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 transition-colors hover:bg-hover-bg hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t.backHome}
        </Link>
      </footer>
    </div>
  );
}
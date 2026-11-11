import type { Metadata } from "next";
import { PrivacyContent } from "@/components/site/privacy-content";
import { SITE_NAME, SITE_OG_LOCALE, SITE_URL } from "@/lib/site";

const title = "隐私政策";
const description =
  "GongJu 隐私政策：纯浏览器端处理，数据不出本机；无账号、无 Cookie、无追踪，本地存储与设备权限逐项说明。";

export const metadata: Metadata = {
  title,
  description,
  keywords: ["隐私政策", "隐私", "数据保护", "本地处理", "privacy policy"],
  alternates: { canonical: "/privacy" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${title} · ${SITE_NAME}`,
    description,
    url: `${SITE_URL}/privacy`,
    locale: SITE_OG_LOCALE,
    alternateLocale: ["en"],
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} · ${SITE_NAME}`,
    description,
  },
};

export default function PrivacyPage() {
  return <PrivacyContent />;
}
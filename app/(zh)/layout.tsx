import type { Metadata } from "next";
import { SiteShell } from "@/components/site/site-shell";
import { siteMetadata } from "@/lib/page-meta";

export const metadata: Metadata = siteMetadata("zh");

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <SiteShell locale="zh">{children}</SiteShell>;
}
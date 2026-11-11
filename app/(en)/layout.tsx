import type { Metadata } from "next";
import { SiteShell } from "@/components/site/site-shell";
import { siteMetadata } from "@/lib/page-meta";

export const metadata: Metadata = siteMetadata("en");

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <SiteShell locale="en">{children}</SiteShell>;
}
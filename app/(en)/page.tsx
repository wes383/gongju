import type { Metadata } from "next";
import { ToolDirectory } from "@/components/site/tool-directory";
import { homeMetadata } from "@/lib/page-meta";

export const metadata: Metadata = homeMetadata("en");

export default function HomePage() {
  return <ToolDirectory />;
}
import type { Metadata } from "next";
import { ToolDirectory } from "@/components/site/tool-directory";
import { homeMetadata } from "@/lib/page-meta";

export const metadata: Metadata = homeMetadata("zh");

export default function HomePage() {
  return <ToolDirectory />;
}
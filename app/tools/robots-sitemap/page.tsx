import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { RobotsSitemapTool } from "@/components/tools/robots-sitemap-tool";

const meta = getTool("robots-sitemap")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/robots-sitemap" },
};

export default function Page() {
  return (
    <ToolFrame slug="robots-sitemap">
      <RobotsSitemapTool />
    </ToolFrame>
  );
}

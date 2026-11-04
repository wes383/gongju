import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { RobotsSitemapTool } from "@/components/tools/robots-sitemap-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("robots-sitemap")!;

export const metadata: Metadata = toolMetadata(meta);

export default function Page() {
  return (
    <ToolFrame slug="robots-sitemap">
      <JsonLd data={toolJsonLd(meta)} />
      <RobotsSitemapTool />
    </ToolFrame>
  );
}

import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { SeoAuditTool } from "@/components/tools/seo-audit-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("seo-audit")!;

export const metadata: Metadata = toolMetadata(meta);

export default function Page() {
  return (
    <ToolFrame slug="seo-audit">
      <JsonLd data={toolJsonLd(meta)} />
      <SeoAuditTool />
    </ToolFrame>
  );
}

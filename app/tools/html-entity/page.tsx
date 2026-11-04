import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { HtmlEntityTool } from "@/components/tools/html-entity-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("html-entity")!;

export const metadata: Metadata = toolMetadata(meta);

export default function Page() {
  return (
    <ToolFrame slug="html-entity">
      <JsonLd data={toolJsonLd(meta)} />
      <HtmlEntityTool />
    </ToolFrame>
  );
}

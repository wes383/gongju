import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { XmlTool } from "@/components/tools/xml-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("xml")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="xml">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <XmlTool />
    </ToolFrame>
  );
}

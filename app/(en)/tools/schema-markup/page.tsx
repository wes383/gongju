import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { SchemaMarkupTool } from "@/components/tools/schema-markup-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("schema-markup")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="schema-markup">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <SchemaMarkupTool />
    </ToolFrame>
  );
}

import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { ReadabilityTool } from "@/components/tools/readability-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("readability")!;

export const metadata: Metadata = toolMetadata(meta);

export default function Page() {
  return (
    <ToolFrame slug="readability">
      <JsonLd data={toolJsonLd(meta)} />
      <ReadabilityTool />
    </ToolFrame>
  );
}

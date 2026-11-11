import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { UaGeneratorTool } from "@/components/tools/ua-generator-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("ua-generator")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="ua-generator">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <UaGeneratorTool />
    </ToolFrame>
  );
}

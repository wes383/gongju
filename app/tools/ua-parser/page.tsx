import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { UaParserTool } from "@/components/tools/ua-parser-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("ua-parser")!;

export const metadata: Metadata = toolMetadata(meta);

export default function Page() {
  return (
    <ToolFrame slug="ua-parser">
      <JsonLd data={toolJsonLd(meta)} />
      <UaParserTool />
    </ToolFrame>
  );
}

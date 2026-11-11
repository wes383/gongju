import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { JsonMockTool } from "@/components/tools/json-mock-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("json-mock")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="json-mock">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <JsonMockTool />
    </ToolFrame>
  );
}

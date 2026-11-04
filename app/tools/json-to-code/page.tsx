import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { JsonToCodeTool } from "@/components/tools/json-to-code-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("json-to-code")!;

export const metadata: Metadata = toolMetadata(meta);

export default function Page() {
  return (
    <ToolFrame slug="json-to-code">
      <JsonLd data={toolJsonLd(meta)} />
      <JsonToCodeTool />
    </ToolFrame>
  );
}

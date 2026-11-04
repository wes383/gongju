import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { DepthOfFieldTool } from "@/components/tools/depth-of-field-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("depth-of-field")!;

export const metadata: Metadata = toolMetadata(meta);

export default function Page() {
  return (
    <ToolFrame slug="depth-of-field">
      <JsonLd data={toolJsonLd(meta)} />
      <DepthOfFieldTool />
    </ToolFrame>
  );
}

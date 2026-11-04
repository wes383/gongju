import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { DimensionalWeightTool } from "@/components/tools/dimensional-weight-tool";
import { ToolFrame } from "@/components/tools/tool-frame";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("dimensional-weight")!;

export const metadata: Metadata = toolMetadata(meta);

export default function Page() {
  return (
    <ToolFrame slug="dimensional-weight">
      <JsonLd data={toolJsonLd(meta)} />
      <DimensionalWeightTool />
    </ToolFrame>
  );
}

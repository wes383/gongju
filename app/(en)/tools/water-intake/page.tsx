import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { WaterIntakeTool } from "@/components/tools/water-intake-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("water-intake")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="water-intake">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <WaterIntakeTool />
    </ToolFrame>
  );
}

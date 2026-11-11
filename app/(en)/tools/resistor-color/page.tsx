import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { ResistorColorTool } from "@/components/tools/resistor-color-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("resistor-color")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="resistor-color">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <ResistorColorTool />
    </ToolFrame>
  );
}

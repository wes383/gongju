import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { ColorConverterTool } from "@/components/tools/color-converter-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("color-converter")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="color-converter">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <ColorConverterTool />
    </ToolFrame>
  );
}

import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { ColorPaletteTool } from "@/components/tools/color-palette-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("color-palette")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="color-palette">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <ColorPaletteTool />
    </ToolFrame>
  );
}

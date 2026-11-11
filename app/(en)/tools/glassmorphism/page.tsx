import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { GlassmorphismTool } from "@/components/tools/glassmorphism-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("glassmorphism")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="glassmorphism">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <GlassmorphismTool />
    </ToolFrame>
  );
}

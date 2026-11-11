import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { PptxTextTool } from "@/components/tools/pptx-text-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("pptx-text")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="pptx-text">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <PptxTextTool />
    </ToolFrame>
  );
}

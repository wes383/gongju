import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { PdfWatermarkTool } from "@/components/tools/pdf-watermark-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("pdf-watermark")!;

export const metadata: Metadata = toolMetadata(meta);

export default function Page() {
  return (
    <ToolFrame slug="pdf-watermark">
      <JsonLd data={toolJsonLd(meta)} />
      <PdfWatermarkTool />
    </ToolFrame>
  );
}

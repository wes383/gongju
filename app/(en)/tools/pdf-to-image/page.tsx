import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { PdfToImageTool } from "@/components/tools/pdf-to-image-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("pdf-to-image")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="pdf-to-image">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <PdfToImageTool />
    </ToolFrame>
  );
}

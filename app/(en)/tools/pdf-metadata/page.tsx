import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { PdfMetadataTool } from "@/components/tools/pdf-metadata-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("pdf-metadata")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="pdf-metadata">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <PdfMetadataTool />
    </ToolFrame>
  );
}

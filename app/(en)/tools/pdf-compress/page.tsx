import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { PdfCompressTool } from "@/components/tools/pdf-compress-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("pdf-compress")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="pdf-compress">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <PdfCompressTool />
    </ToolFrame>
  );
}

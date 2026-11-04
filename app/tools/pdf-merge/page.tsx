import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { PdfMergeTool } from "@/components/tools/pdf-merge-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("pdf-merge")!;

export const metadata: Metadata = toolMetadata(meta);

export default function Page() {
  return (
    <ToolFrame slug="pdf-merge">
      <JsonLd data={toolJsonLd(meta)} />
      <PdfMergeTool />
    </ToolFrame>
  );
}

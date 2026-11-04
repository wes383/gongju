import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { PdfRedactTool } from "@/components/tools/pdf-redact-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("pdf-redact")!;

export const metadata: Metadata = toolMetadata(meta);

export default function Page() {
  return (
    <ToolFrame slug="pdf-redact">
      <JsonLd data={toolJsonLd(meta)} />
      <PdfRedactTool />
    </ToolFrame>
  );
}

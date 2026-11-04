import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { PdfOrganizeTool } from "@/components/tools/pdf-organize-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("pdf-organize")!;

export const metadata: Metadata = toolMetadata(meta);

export default function Page() {
  return (
    <ToolFrame slug="pdf-organize">
      <JsonLd data={toolJsonLd(meta)} />
      <PdfOrganizeTool />
    </ToolFrame>
  );
}

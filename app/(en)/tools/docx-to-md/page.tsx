import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { DocxToMdTool } from "@/components/tools/docx-to-md-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("docx-to-md")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="docx-to-md">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <DocxToMdTool />
    </ToolFrame>
  );
}

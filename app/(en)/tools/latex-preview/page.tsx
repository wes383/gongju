import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { LatexPreviewTool } from "@/components/tools/latex-preview-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("latex-preview")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="latex-preview">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <LatexPreviewTool />
    </ToolFrame>
  );
}

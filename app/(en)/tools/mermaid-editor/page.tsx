import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { MermaidEditorTool } from "@/components/tools/mermaid-editor-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("mermaid-editor")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="mermaid-editor">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <MermaidEditorTool />
    </ToolFrame>
  );
}

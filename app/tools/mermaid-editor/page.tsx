import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { MermaidEditorTool } from "@/components/tools/mermaid-editor-tool";

const meta = getTool("mermaid-editor")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/mermaid-editor" },
};

export default function Page() {
  return (
    <ToolFrame slug="mermaid-editor">
      <MermaidEditorTool />
    </ToolFrame>
  );
}

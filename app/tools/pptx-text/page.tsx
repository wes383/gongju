import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { PptxTextTool } from "@/components/tools/pptx-text-tool";

const meta = getTool("pptx-text")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="pptx-text">
      <PptxTextTool />
    </ToolFrame>
  );
}

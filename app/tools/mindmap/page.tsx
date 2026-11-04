import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { MindmapTool } from "@/components/tools/mindmap-tool";

const meta = getTool("mindmap")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="mindmap">
      <MindmapTool />
    </ToolFrame>
  );
}

import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { GlassmorphismTool } from "@/components/tools/glassmorphism-tool";

const meta = getTool("glassmorphism")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="glassmorphism">
      <GlassmorphismTool />
    </ToolFrame>
  );
}

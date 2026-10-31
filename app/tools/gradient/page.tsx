import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { GradientTool } from "@/components/tools/gradient-tool";

const meta = getTool("gradient")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="gradient">
      <GradientTool />
    </ToolFrame>
  );
}

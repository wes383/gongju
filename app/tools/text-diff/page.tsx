import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { TextDiffTool } from "@/components/tools/text-diff-tool";

const meta = getTool("text-diff")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="text-diff">
      <TextDiffTool />
    </ToolFrame>
  );
}

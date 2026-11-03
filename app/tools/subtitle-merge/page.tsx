import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { SubtitleMergeTool } from "@/components/tools/subtitle-merge-tool";

const meta = getTool("subtitle-merge")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="subtitle-merge">
      <SubtitleMergeTool />
    </ToolFrame>
  );
}

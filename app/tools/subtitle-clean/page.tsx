import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { SubtitleCleanTool } from "@/components/tools/subtitle-clean-tool";

const meta = getTool("subtitle-clean")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="subtitle-clean">
      <SubtitleCleanTool />
    </ToolFrame>
  );
}

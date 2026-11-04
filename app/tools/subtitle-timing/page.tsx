import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { SubtitleTimingTool } from "@/components/tools/subtitle-timing-tool";

const meta = getTool("subtitle-timing")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/subtitle-timing" },
};

export default function Page() {
  return (
    <ToolFrame slug="subtitle-timing">
      <SubtitleTimingTool />
    </ToolFrame>
  );
}

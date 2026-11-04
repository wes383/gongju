import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { SubtitleConvertTool } from "@/components/tools/subtitle-convert-tool";

const meta = getTool("subtitle-convert")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/subtitle-convert" },
};

export default function Page() {
  return (
    <ToolFrame slug="subtitle-convert">
      <SubtitleConvertTool />
    </ToolFrame>
  );
}

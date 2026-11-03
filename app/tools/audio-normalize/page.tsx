import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { AudioNormalizeTool } from "@/components/tools/audio-normalize-tool";

const meta = getTool("audio-normalize")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="audio-normalize">
      <AudioNormalizeTool />
    </ToolFrame>
  );
}

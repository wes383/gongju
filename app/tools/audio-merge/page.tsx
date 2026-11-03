import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { AudioMergeTool } from "@/components/tools/audio-merge-tool";

const meta = getTool("audio-merge")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="audio-merge">
      <AudioMergeTool />
    </ToolFrame>
  );
}

import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { AudioTrimTool } from "@/components/tools/audio-trim-tool";

const meta = getTool("audio-trim")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/audio-trim" },
};

export default function Page() {
  return (
    <ToolFrame slug="audio-trim">
      <AudioTrimTool />
    </ToolFrame>
  );
}

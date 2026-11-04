import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { VideoGifTool } from "@/components/tools/video-gif-tool";

const meta = getTool("video-gif")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/video-gif" },
};

export default function Page() {
  return (
    <ToolFrame slug="video-gif">
      <VideoGifTool />
    </ToolFrame>
  );
}

import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { MediaInfoTool } from "@/components/tools/media-info-tool";

const meta = getTool("media-info")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/media-info" },
};

export default function Page() {
  return (
    <ToolFrame slug="media-info">
      <MediaInfoTool />
    </ToolFrame>
  );
}

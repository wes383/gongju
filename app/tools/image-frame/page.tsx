import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { ImageFrameTool } from "@/components/tools/image-frame-tool";

const meta = getTool("image-frame")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/image-frame" },
};

export default function Page() {
  return (
    <ToolFrame slug="image-frame">
      <ImageFrameTool />
    </ToolFrame>
  );
}

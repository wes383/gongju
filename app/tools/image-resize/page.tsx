import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { ImageResizeTool } from "@/components/tools/image-resize-tool";

const meta = getTool("image-resize")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="image-resize">
      <ImageResizeTool />
    </ToolFrame>
  );
}

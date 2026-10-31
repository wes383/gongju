import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { ImageWatermarkTool } from "@/components/tools/image-watermark-tool";

const meta = getTool("image-watermark")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="image-watermark">
      <ImageWatermarkTool />
    </ToolFrame>
  );
}

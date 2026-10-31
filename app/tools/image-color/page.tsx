import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { ImageColorTool } from "@/components/tools/image-color-tool";

const meta = getTool("image-color")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="image-color">
      <ImageColorTool />
    </ToolFrame>
  );
}

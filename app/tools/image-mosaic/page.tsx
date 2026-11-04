import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { ImageMosaicTool } from "@/components/tools/image-mosaic-tool";

const meta = getTool("image-mosaic")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/image-mosaic" },
};

export default function Page() {
  return (
    <ToolFrame slug="image-mosaic">
      <ImageMosaicTool />
    </ToolFrame>
  );
}

import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { ImageSplitTool } from "@/components/tools/image-split-tool";

const meta = getTool("image-split")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/image-split" },
};

export default function Page() {
  return (
    <ToolFrame slug="image-split">
      <ImageSplitTool />
    </ToolFrame>
  );
}

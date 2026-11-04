import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { ImageCompareTool } from "@/components/tools/image-compare-tool";

const meta = getTool("image-compare")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/image-compare" },
};

export default function Page() {
  return (
    <ToolFrame slug="image-compare">
      <ImageCompareTool />
    </ToolFrame>
  );
}

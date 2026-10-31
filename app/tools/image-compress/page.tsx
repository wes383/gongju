import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { ImageCompressTool } from "@/components/tools/image-compress-tool";

const meta = getTool("image-compress")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="image-compress">
      <ImageCompressTool />
    </ToolFrame>
  );
}

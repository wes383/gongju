import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { ImageConvertTool } from "@/components/tools/image-convert-tool";

const meta = getTool("image-convert")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/image-convert" },
};

export default function Page() {
  return (
    <ToolFrame slug="image-convert">
      <ImageConvertTool />
    </ToolFrame>
  );
}

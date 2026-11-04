import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { ImageCollageTool } from "@/components/tools/image-collage-tool";

const meta = getTool("image-collage")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/image-collage" },
};

export default function Page() {
  return (
    <ToolFrame slug="image-collage">
      <ImageCollageTool />
    </ToolFrame>
  );
}

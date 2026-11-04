import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { ImageExifTool } from "@/components/tools/image-exif-tool";

const meta = getTool("image-exif")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/image-exif" },
};

export default function Page() {
  return (
    <ToolFrame slug="image-exif">
      <ImageExifTool />
    </ToolFrame>
  );
}

import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { ImageBase64Tool } from "@/components/tools/image-base64-tool";

const meta = getTool("image-base64")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/image-base64" },
};

export default function Page() {
  return (
    <ToolFrame slug="image-base64">
      <ImageBase64Tool />
    </ToolFrame>
  );
}

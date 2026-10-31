import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { ImagesToPdfTool } from "@/components/tools/images-to-pdf-tool";

const meta = getTool("images-to-pdf")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="images-to-pdf">
      <ImagesToPdfTool />
    </ToolFrame>
  );
}

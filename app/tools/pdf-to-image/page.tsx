import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { PdfToImageTool } from "@/components/tools/pdf-to-image-tool";

const meta = getTool("pdf-to-image")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/pdf-to-image" },
};

export default function Page() {
  return (
    <ToolFrame slug="pdf-to-image">
      <PdfToImageTool />
    </ToolFrame>
  );
}

import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { PdfWatermarkTool } from "@/components/tools/pdf-watermark-tool";

const meta = getTool("pdf-watermark")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/pdf-watermark" },
};

export default function Page() {
  return (
    <ToolFrame slug="pdf-watermark">
      <PdfWatermarkTool />
    </ToolFrame>
  );
}

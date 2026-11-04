import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { PdfTextTool } from "@/components/tools/pdf-text-tool";

const meta = getTool("pdf-text")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/pdf-text" },
};

export default function Page() {
  return (
    <ToolFrame slug="pdf-text">
      <PdfTextTool />
    </ToolFrame>
  );
}

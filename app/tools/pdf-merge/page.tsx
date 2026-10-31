import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { PdfMergeTool } from "@/components/tools/pdf-merge-tool";

const meta = getTool("pdf-merge")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="pdf-merge">
      <PdfMergeTool />
    </ToolFrame>
  );
}

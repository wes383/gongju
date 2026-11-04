import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { PdfSplitTool } from "@/components/tools/pdf-split-tool";

const meta = getTool("pdf-split")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/pdf-split" },
};

export default function Page() {
  return (
    <ToolFrame slug="pdf-split">
      <PdfSplitTool />
    </ToolFrame>
  );
}

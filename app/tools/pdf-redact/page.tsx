import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { PdfRedactTool } from "@/components/tools/pdf-redact-tool";

const meta = getTool("pdf-redact")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="pdf-redact">
      <PdfRedactTool />
    </ToolFrame>
  );
}

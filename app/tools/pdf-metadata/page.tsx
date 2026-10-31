import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { PdfMetadataTool } from "@/components/tools/pdf-metadata-tool";

const meta = getTool("pdf-metadata")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="pdf-metadata">
      <PdfMetadataTool />
    </ToolFrame>
  );
}

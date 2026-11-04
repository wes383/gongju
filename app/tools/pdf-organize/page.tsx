import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { PdfOrganizeTool } from "@/components/tools/pdf-organize-tool";

const meta = getTool("pdf-organize")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/pdf-organize" },
};

export default function Page() {
  return (
    <ToolFrame slug="pdf-organize">
      <PdfOrganizeTool />
    </ToolFrame>
  );
}

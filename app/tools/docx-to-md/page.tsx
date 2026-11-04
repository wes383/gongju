import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { DocxToMdTool } from "@/components/tools/docx-to-md-tool";

const meta = getTool("docx-to-md")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/docx-to-md" },
};

export default function Page() {
  return (
    <ToolFrame slug="docx-to-md">
      <DocxToMdTool />
    </ToolFrame>
  );
}

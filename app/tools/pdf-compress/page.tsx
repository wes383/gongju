import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { PdfCompressTool } from "@/components/tools/pdf-compress-tool";

const meta = getTool("pdf-compress")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/pdf-compress" },
};

export default function Page() {
  return (
    <ToolFrame slug="pdf-compress">
      <PdfCompressTool />
    </ToolFrame>
  );
}

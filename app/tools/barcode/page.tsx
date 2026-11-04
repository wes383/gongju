import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { BarcodeTool } from "@/components/tools/barcode-tool";

const meta = getTool("barcode")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/barcode" },
};

export default function Page() {
  return (
    <ToolFrame slug="barcode">
      <BarcodeTool />
    </ToolFrame>
  );
}

import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { ColorConverterTool } from "@/components/tools/color-converter-tool";

const meta = getTool("color-converter")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="color-converter">
      <ColorConverterTool />
    </ToolFrame>
  );
}

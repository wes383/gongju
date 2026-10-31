import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { ColorPaletteTool } from "@/components/tools/color-palette-tool";

const meta = getTool("color-palette")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="color-palette">
      <ColorPaletteTool />
    </ToolFrame>
  );
}

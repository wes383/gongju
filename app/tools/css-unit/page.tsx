import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { CssUnitTool } from "@/components/tools/css-unit-tool";

const meta = getTool("css-unit")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="css-unit">
      <CssUnitTool />
    </ToolFrame>
  );
}

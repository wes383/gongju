import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { SvgTool } from "@/components/tools/svg-tool";

const meta = getTool("svg")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="svg">
      <SvgTool />
    </ToolFrame>
  );
}

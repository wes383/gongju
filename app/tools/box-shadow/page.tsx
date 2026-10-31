import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { BoxShadowTool } from "@/components/tools/box-shadow-tool";

const meta = getTool("box-shadow")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="box-shadow">
      <BoxShadowTool />
    </ToolFrame>
  );
}

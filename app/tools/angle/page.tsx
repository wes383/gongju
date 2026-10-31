import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { AngleTool } from "@/components/tools/angle-tool";

const meta = getTool("angle")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="angle">
      <AngleTool />
    </ToolFrame>
  );
}

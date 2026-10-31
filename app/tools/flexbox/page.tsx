import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { FlexboxTool } from "@/components/tools/flexbox-tool";

const meta = getTool("flexbox")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="flexbox">
      <FlexboxTool />
    </ToolFrame>
  );
}

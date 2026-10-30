import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { TextSortTool } from "@/components/tools/text-sort-tool";

const meta = getTool("text-sort")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="text-sort">
      <TextSortTool />
    </ToolFrame>
  );
}

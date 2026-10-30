import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { DateDiffTool } from "@/components/tools/date-diff-tool";

const meta = getTool("date-diff")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="date-diff">
      <DateDiffTool />
    </ToolFrame>
  );
}

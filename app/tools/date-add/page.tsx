import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { DateAddTool } from "@/components/tools/date-add-tool";

const meta = getTool("date-add")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="date-add">
      <DateAddTool />
    </ToolFrame>
  );
}

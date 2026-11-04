import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { BatchRenameTool } from "@/components/tools/batch-rename-tool";

const meta = getTool("batch-rename")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/batch-rename" },
};

export default function Page() {
  return (
    <ToolFrame slug="batch-rename">
      <BatchRenameTool />
    </ToolFrame>
  );
}

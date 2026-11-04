import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { SqlGenerateTool } from "@/components/tools/sql-generate-tool";

const meta = getTool("sql-generate")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/sql-generate" },
};

export default function Page() {
  return (
    <ToolFrame slug="sql-generate">
      <SqlGenerateTool />
    </ToolFrame>
  );
}

import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { SqlFormatTool } from "@/components/tools/sql-format-tool";

const meta = getTool("sql-format")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="sql-format">
      <SqlFormatTool />
    </ToolFrame>
  );
}

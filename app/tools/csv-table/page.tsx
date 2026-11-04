import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { CsvTableTool } from "@/components/tools/csv-table-tool";

const meta = getTool("csv-table")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/csv-table" },
};

export default function Page() {
  return (
    <ToolFrame slug="csv-table">
      <CsvTableTool />
    </ToolFrame>
  );
}

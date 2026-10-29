import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { CsvTool } from "@/components/tools/csv-tool";

const meta = getTool("csv")!;

export const metadata: Metadata = {
  title: meta.name,
  description: meta.description,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame tool={meta}>
      <CsvTool />
    </ToolFrame>
  );
}

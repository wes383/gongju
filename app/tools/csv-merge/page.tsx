import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { CsvMergeTool } from "@/components/tools/csv-merge-tool";

const meta = getTool("csv-merge")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/csv-merge" },
};

export default function Page() {
  return (
    <ToolFrame slug="csv-merge">
      <CsvMergeTool />
    </ToolFrame>
  );
}

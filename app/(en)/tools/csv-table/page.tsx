import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { CsvTableTool } from "@/components/tools/csv-table-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("csv-table")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="csv-table">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <CsvTableTool />
    </ToolFrame>
  );
}

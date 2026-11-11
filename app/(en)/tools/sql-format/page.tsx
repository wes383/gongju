import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { SqlFormatTool } from "@/components/tools/sql-format-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("sql-format")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="sql-format">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <SqlFormatTool />
    </ToolFrame>
  );
}

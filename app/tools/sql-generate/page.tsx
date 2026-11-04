import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { SqlGenerateTool } from "@/components/tools/sql-generate-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("sql-generate")!;

export const metadata: Metadata = toolMetadata(meta);

export default function Page() {
  return (
    <ToolFrame slug="sql-generate">
      <JsonLd data={toolJsonLd(meta)} />
      <SqlGenerateTool />
    </ToolFrame>
  );
}

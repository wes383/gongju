import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { BatchRenameTool } from "@/components/tools/batch-rename-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("batch-rename")!;

export const metadata: Metadata = toolMetadata(meta);

export default function Page() {
  return (
    <ToolFrame slug="batch-rename">
      <JsonLd data={toolJsonLd(meta)} />
      <BatchRenameTool />
    </ToolFrame>
  );
}

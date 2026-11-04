import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { JsonTreeTool } from "@/components/tools/json-tree-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("json-tree")!;

export const metadata: Metadata = toolMetadata(meta);

export default function Page() {
  return (
    <ToolFrame slug="json-tree">
      <JsonLd data={toolJsonLd(meta)} />
      <JsonTreeTool />
    </ToolFrame>
  );
}

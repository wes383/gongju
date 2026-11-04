import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { StringEscapeTool } from "@/components/tools/string-escape-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("string-escape")!;

export const metadata: Metadata = toolMetadata(meta);

export default function Page() {
  return (
    <ToolFrame slug="string-escape">
      <JsonLd data={toolJsonLd(meta)} />
      <StringEscapeTool />
    </ToolFrame>
  );
}

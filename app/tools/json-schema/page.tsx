import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { JsonSchemaTool } from "@/components/tools/json-schema-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("json-schema")!;

export const metadata: Metadata = toolMetadata(meta);

export default function Page() {
  return (
    <ToolFrame slug="json-schema">
      <JsonLd data={toolJsonLd(meta)} />
      <JsonSchemaTool />
    </ToolFrame>
  );
}

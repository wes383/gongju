import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { MimeTypeTool } from "@/components/tools/mime-type-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("mime-type")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="mime-type">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <MimeTypeTool />
    </ToolFrame>
  );
}

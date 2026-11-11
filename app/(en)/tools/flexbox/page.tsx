import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { FlexboxTool } from "@/components/tools/flexbox-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("flexbox")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="flexbox">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <FlexboxTool />
    </ToolFrame>
  );
}

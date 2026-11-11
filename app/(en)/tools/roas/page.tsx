import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { RoasTool } from "@/components/tools/roas-tool";
import { ToolFrame } from "@/components/tools/tool-frame";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("roas")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="roas">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <RoasTool />
    </ToolFrame>
  );
}

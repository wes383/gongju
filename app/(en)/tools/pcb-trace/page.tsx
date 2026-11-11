import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { PcbTraceTool } from "@/components/tools/pcb-trace-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("pcb-trace")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="pcb-trace">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <PcbTraceTool />
    </ToolFrame>
  );
}

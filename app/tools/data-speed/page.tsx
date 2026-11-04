import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { DataSpeedTool } from "@/components/tools/data-speed-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("data-speed")!;

export const metadata: Metadata = toolMetadata(meta);

export default function Page() {
  return (
    <ToolFrame slug="data-speed">
      <JsonLd data={toolJsonLd(meta)} />
      <DataSpeedTool />
    </ToolFrame>
  );
}

import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { ChartMakerTool } from "@/components/tools/chart-maker-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("chart-maker")!;

export const metadata: Metadata = toolMetadata(meta);

export default function Page() {
  return (
    <ToolFrame slug="chart-maker">
      <JsonLd data={toolJsonLd(meta)} />
      <ChartMakerTool />
    </ToolFrame>
  );
}

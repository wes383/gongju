import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { FunctionPlotTool } from "@/components/tools/function-plot-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("function-plot")!;

export const metadata: Metadata = toolMetadata(meta);

export default function Page() {
  return (
    <ToolFrame slug="function-plot">
      <JsonLd data={toolJsonLd(meta)} />
      <FunctionPlotTool />
    </ToolFrame>
  );
}

import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { StatisticsTool } from "@/components/tools/statistics-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("statistics")!;

export const metadata: Metadata = toolMetadata(meta);

export default function Page() {
  return (
    <ToolFrame slug="statistics">
      <JsonLd data={toolJsonLd(meta)} />
      <StatisticsTool />
    </ToolFrame>
  );
}

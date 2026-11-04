import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { SubtitleTimingTool } from "@/components/tools/subtitle-timing-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("subtitle-timing")!;

export const metadata: Metadata = toolMetadata(meta);

export default function Page() {
  return (
    <ToolFrame slug="subtitle-timing">
      <JsonLd data={toolJsonLd(meta)} />
      <SubtitleTimingTool />
    </ToolFrame>
  );
}

import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { SubtitleStudyTool } from "@/components/tools/subtitle-study-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("subtitle-study")!;

export const metadata: Metadata = toolMetadata(meta);

export default function Page() {
  return (
    <ToolFrame slug="subtitle-study">
      <JsonLd data={toolJsonLd(meta)} />
      <SubtitleStudyTool />
    </ToolFrame>
  );
}

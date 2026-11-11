import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { SubtitleConvertTool } from "@/components/tools/subtitle-convert-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("subtitle-convert")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="subtitle-convert">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <SubtitleConvertTool />
    </ToolFrame>
  );
}

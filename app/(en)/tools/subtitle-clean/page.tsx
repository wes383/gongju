import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { SubtitleCleanTool } from "@/components/tools/subtitle-clean-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("subtitle-clean")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="subtitle-clean">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <SubtitleCleanTool />
    </ToolFrame>
  );
}

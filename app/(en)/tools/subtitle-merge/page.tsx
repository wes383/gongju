import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { SubtitleMergeTool } from "@/components/tools/subtitle-merge-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("subtitle-merge")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="subtitle-merge">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <SubtitleMergeTool />
    </ToolFrame>
  );
}

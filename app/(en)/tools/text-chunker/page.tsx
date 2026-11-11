import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { TextChunkerTool } from "@/components/tools/text-chunker-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("text-chunker")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="text-chunker">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <TextChunkerTool />
    </ToolFrame>
  );
}

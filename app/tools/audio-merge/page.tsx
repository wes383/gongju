import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { AudioMergeTool } from "@/components/tools/audio-merge-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("audio-merge")!;

export const metadata: Metadata = toolMetadata(meta);

export default function Page() {
  return (
    <ToolFrame slug="audio-merge">
      <JsonLd data={toolJsonLd(meta)} />
      <AudioMergeTool />
    </ToolFrame>
  );
}

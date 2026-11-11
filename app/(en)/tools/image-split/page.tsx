import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { ImageSplitTool } from "@/components/tools/image-split-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("image-split")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="image-split">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <ImageSplitTool />
    </ToolFrame>
  );
}

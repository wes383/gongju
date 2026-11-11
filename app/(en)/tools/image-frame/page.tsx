import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { ImageFrameTool } from "@/components/tools/image-frame-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("image-frame")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="image-frame">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <ImageFrameTool />
    </ToolFrame>
  );
}

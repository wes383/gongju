import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { ImageMosaicTool } from "@/components/tools/image-mosaic-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("image-mosaic")!;

export const metadata: Metadata = toolMetadata(meta);

export default function Page() {
  return (
    <ToolFrame slug="image-mosaic">
      <JsonLd data={toolJsonLd(meta)} />
      <ImageMosaicTool />
    </ToolFrame>
  );
}

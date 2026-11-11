import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { ImagesToPdfTool } from "@/components/tools/images-to-pdf-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("images-to-pdf")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="images-to-pdf">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <ImagesToPdfTool />
    </ToolFrame>
  );
}

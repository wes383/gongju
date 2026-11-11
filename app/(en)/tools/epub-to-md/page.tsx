import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { EpubToMdTool } from "@/components/tools/epub-to-md-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("epub-to-md")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="epub-to-md">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <EpubToMdTool />
    </ToolFrame>
  );
}

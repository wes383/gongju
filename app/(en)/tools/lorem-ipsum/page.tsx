import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { LoremTool } from "@/components/tools/lorem-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("lorem-ipsum")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="lorem-ipsum">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <LoremTool />
    </ToolFrame>
  );
}

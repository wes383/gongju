import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { ZipTool } from "@/components/tools/zip-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("zip")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="zip">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <ZipTool />
    </ToolFrame>
  );
}

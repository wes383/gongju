import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { HttpHeaderTool } from "@/components/tools/http-header-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("http-header")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="http-header">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <HttpHeaderTool />
    </ToolFrame>
  );
}

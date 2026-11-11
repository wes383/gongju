import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { UrlParserTool } from "@/components/tools/url-parser-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("url-parser")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="url-parser">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <UrlParserTool />
    </ToolFrame>
  );
}

import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { UrlEncodeTool } from "@/components/tools/url-encode-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("url-encode")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="url-encode">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <UrlEncodeTool />
    </ToolFrame>
  );
}

import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { MarkdownTool } from "@/components/tools/markdown-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("markdown")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="markdown">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <MarkdownTool />
    </ToolFrame>
  );
}

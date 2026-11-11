import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { CodeFormatTool } from "@/components/tools/code-format-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("code-format")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="code-format">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <CodeFormatTool />
    </ToolFrame>
  );
}

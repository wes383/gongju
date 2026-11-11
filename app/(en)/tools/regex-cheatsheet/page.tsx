import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { RegexCheatsheetTool } from "@/components/tools/regex-cheatsheet-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("regex-cheatsheet")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="regex-cheatsheet">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <RegexCheatsheetTool />
    </ToolFrame>
  );
}

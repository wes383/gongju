import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { RegexTesterTool } from "@/components/tools/regex-tester-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("regex-tester")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="regex-tester">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <RegexTesterTool />
    </ToolFrame>
  );
}

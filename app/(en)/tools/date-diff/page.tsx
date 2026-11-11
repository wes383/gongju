import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { DateDiffTool } from "@/components/tools/date-diff-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("date-diff")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="date-diff">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <DateDiffTool />
    </ToolFrame>
  );
}

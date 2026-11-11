import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { ContrastCheckerTool } from "@/components/tools/contrast-checker-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("contrast-checker")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="contrast-checker">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <ContrastCheckerTool />
    </ToolFrame>
  );
}

import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { NumberToChineseTool } from "@/components/tools/number-to-chinese-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("number-to-chinese")!;

export const metadata: Metadata = toolMetadata(meta);

export default function Page() {
  return (
    <ToolFrame slug="number-to-chinese">
      <JsonLd data={toolJsonLd(meta)} />
      <NumberToChineseTool />
    </ToolFrame>
  );
}

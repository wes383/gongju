import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { TokenCounterTool } from "@/components/tools/token-counter-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("token-counter")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="token-counter">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <TokenCounterTool />
    </ToolFrame>
  );
}

import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { DiscountStackTool } from "@/components/tools/discount-stack-tool";
import { ToolFrame } from "@/components/tools/tool-frame";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("discount-stack")!;

export const metadata: Metadata = toolMetadata(meta);

export default function Page() {
  return (
    <ToolFrame slug="discount-stack">
      <JsonLd data={toolJsonLd(meta)} />
      <DiscountStackTool />
    </ToolFrame>
  );
}

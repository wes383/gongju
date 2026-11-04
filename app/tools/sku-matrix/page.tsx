import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { SkuMatrixTool } from "@/components/tools/sku-matrix-tool";
import { ToolFrame } from "@/components/tools/tool-frame";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("sku-matrix")!;

export const metadata: Metadata = toolMetadata(meta);

export default function Page() {
  return (
    <ToolFrame slug="sku-matrix">
      <JsonLd data={toolJsonLd(meta)} />
      <SkuMatrixTool />
    </ToolFrame>
  );
}

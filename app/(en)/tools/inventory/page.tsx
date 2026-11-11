import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { InventoryTool } from "@/components/tools/inventory-tool";
import { ToolFrame } from "@/components/tools/tool-frame";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("inventory")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="inventory">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <InventoryTool />
    </ToolFrame>
  );
}

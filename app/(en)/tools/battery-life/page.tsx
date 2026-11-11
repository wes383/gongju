import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { BatteryLifeTool } from "@/components/tools/battery-life-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("battery-life")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="battery-life">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <BatteryLifeTool />
    </ToolFrame>
  );
}

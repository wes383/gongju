import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { VoltageDividerTool } from "@/components/tools/voltage-divider-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("voltage-divider")!;

export const metadata: Metadata = toolMetadata(meta);

export default function Page() {
  return (
    <ToolFrame slug="voltage-divider">
      <JsonLd data={toolJsonLd(meta)} />
      <VoltageDividerTool />
    </ToolFrame>
  );
}

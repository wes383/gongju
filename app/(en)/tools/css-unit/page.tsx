import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { CssUnitTool } from "@/components/tools/css-unit-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("css-unit")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="css-unit">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <CssUnitTool />
    </ToolFrame>
  );
}

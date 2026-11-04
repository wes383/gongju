import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { BoxShadowTool } from "@/components/tools/box-shadow-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("box-shadow")!;

export const metadata: Metadata = toolMetadata(meta);

export default function Page() {
  return (
    <ToolFrame slug="box-shadow">
      <JsonLd data={toolJsonLd(meta)} />
      <BoxShadowTool />
    </ToolFrame>
  );
}

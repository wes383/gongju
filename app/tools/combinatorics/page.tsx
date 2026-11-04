import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { CombinatoricsTool } from "@/components/tools/combinatorics-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("combinatorics")!;

export const metadata: Metadata = toolMetadata(meta);

export default function Page() {
  return (
    <ToolFrame slug="combinatorics">
      <JsonLd data={toolJsonLd(meta)} />
      <CombinatoricsTool />
    </ToolFrame>
  );
}

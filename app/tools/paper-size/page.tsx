import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { PaperSizeTool } from "@/components/tools/paper-size-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("paper-size")!;

export const metadata: Metadata = toolMetadata(meta);

export default function Page() {
  return (
    <ToolFrame slug="paper-size">
      <JsonLd data={toolJsonLd(meta)} />
      <PaperSizeTool />
    </ToolFrame>
  );
}

import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { ColorBlindnessTool } from "@/components/tools/color-blindness-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("color-blindness")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="color-blindness">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <ColorBlindnessTool />
    </ToolFrame>
  );
}

import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { TextCipherTool } from "@/components/tools/text-cipher-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("text-cipher")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="text-cipher">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <TextCipherTool />
    </ToolFrame>
  );
}

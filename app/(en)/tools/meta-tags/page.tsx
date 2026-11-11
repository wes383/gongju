import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { MetaTagsTool } from "@/components/tools/meta-tags-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("meta-tags")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="meta-tags">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <MetaTagsTool />
    </ToolFrame>
  );
}

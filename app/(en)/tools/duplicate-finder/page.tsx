import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { DuplicateFinderTool } from "@/components/tools/duplicate-finder-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("duplicate-finder")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="duplicate-finder">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <DuplicateFinderTool />
    </ToolFrame>
  );
}

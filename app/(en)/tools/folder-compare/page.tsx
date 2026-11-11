import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { FolderCompareTool } from "@/components/tools/folder-compare-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("folder-compare")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="folder-compare">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <FolderCompareTool />
    </ToolFrame>
  );
}

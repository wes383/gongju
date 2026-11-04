import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { XlsxViewerTool } from "@/components/tools/xlsx-viewer-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("xlsx-viewer")!;

export const metadata: Metadata = toolMetadata(meta);

export default function Page() {
  return (
    <ToolFrame slug="xlsx-viewer">
      <JsonLd data={toolJsonLd(meta)} />
      <XlsxViewerTool />
    </ToolFrame>
  );
}

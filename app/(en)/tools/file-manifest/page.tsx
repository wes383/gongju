import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { FileManifestTool } from "@/components/tools/file-manifest-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("file-manifest")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="file-manifest">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <FileManifestTool />
    </ToolFrame>
  );
}

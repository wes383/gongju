import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { FileManifestTool } from "@/components/tools/file-manifest-tool";

const meta = getTool("file-manifest")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="file-manifest">
      <FileManifestTool />
    </ToolFrame>
  );
}

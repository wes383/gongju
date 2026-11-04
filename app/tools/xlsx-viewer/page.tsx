import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { XlsxViewerTool } from "@/components/tools/xlsx-viewer-tool";

const meta = getTool("xlsx-viewer")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="xlsx-viewer">
      <XlsxViewerTool />
    </ToolFrame>
  );
}

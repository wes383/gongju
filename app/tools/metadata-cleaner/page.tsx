import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { MetadataCleanerTool } from "@/components/tools/metadata-cleaner-tool";

const meta = getTool("metadata-cleaner")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="metadata-cleaner">
      <MetadataCleanerTool />
    </ToolFrame>
  );
}

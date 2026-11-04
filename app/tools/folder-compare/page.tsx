import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { FolderCompareTool } from "@/components/tools/folder-compare-tool";

const meta = getTool("folder-compare")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/folder-compare" },
};

export default function Page() {
  return (
    <ToolFrame slug="folder-compare">
      <FolderCompareTool />
    </ToolFrame>
  );
}

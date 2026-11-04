import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { FileTypeTool } from "@/components/tools/file-type-tool";

const meta = getTool("file-type")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="file-type">
      <FileTypeTool />
    </ToolFrame>
  );
}

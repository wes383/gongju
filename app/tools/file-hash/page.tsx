import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { FileHashTool } from "@/components/tools/file-hash-tool";

const meta = getTool("file-hash")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="file-hash">
      <FileHashTool />
    </ToolFrame>
  );
}

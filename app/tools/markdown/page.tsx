import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { MarkdownTool } from "@/components/tools/markdown-tool";

const meta = getTool("markdown")!;

export const metadata: Metadata = {
  title: meta.name,
  description: meta.description,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame tool={meta}>
      <MarkdownTool />
    </ToolFrame>
  );
}

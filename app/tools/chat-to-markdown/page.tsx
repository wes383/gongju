import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { ChatToMarkdownTool } from "@/components/tools/chat-to-markdown-tool";

const meta = getTool("chat-to-markdown")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="chat-to-markdown">
      <ChatToMarkdownTool />
    </ToolFrame>
  );
}

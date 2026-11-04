import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { ChatToMarkdownTool } from "@/components/tools/chat-to-markdown-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("chat-to-markdown")!;

export const metadata: Metadata = toolMetadata(meta);

export default function Page() {
  return (
    <ToolFrame slug="chat-to-markdown">
      <JsonLd data={toolJsonLd(meta)} />
      <ChatToMarkdownTool />
    </ToolFrame>
  );
}

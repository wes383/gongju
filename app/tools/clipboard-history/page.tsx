import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { ClipboardHistoryTool } from "@/components/tools/clipboard-history-tool";

const meta = getTool("clipboard-history")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="clipboard-history">
      <ClipboardHistoryTool />
    </ToolFrame>
  );
}

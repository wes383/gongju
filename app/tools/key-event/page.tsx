import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { KeyEventTool } from "@/components/tools/key-event-tool";

const meta = getTool("key-event")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="key-event">
      <KeyEventTool />
    </ToolFrame>
  );
}

import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { HtmlEntityTool } from "@/components/tools/html-entity-tool";

const meta = getTool("html-entity")!;

export const metadata: Metadata = {
  title: meta.name,
  description: meta.description,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame tool={meta}>
      <HtmlEntityTool />
    </ToolFrame>
  );
}

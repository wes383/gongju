import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { QueryStringTool } from "@/components/tools/query-string-tool";

const meta = getTool("query-string")!;

export const metadata: Metadata = {
  title: meta.name,
  description: meta.description,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame tool={meta}>
      <QueryStringTool />
    </ToolFrame>
  );
}

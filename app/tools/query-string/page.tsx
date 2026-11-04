import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { QueryStringTool } from "@/components/tools/query-string-tool";

const meta = getTool("query-string")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/query-string" },
};

export default function Page() {
  return (
    <ToolFrame slug="query-string">
      <QueryStringTool />
    </ToolFrame>
  );
}

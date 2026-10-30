import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { JsonPathTool } from "@/components/tools/json-path-tool";

const meta = getTool("json-path")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="json-path">
      <JsonPathTool />
    </ToolFrame>
  );
}

import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { JsonTreeTool } from "@/components/tools/json-tree-tool";

const meta = getTool("json-tree")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="json-tree">
      <JsonTreeTool />
    </ToolFrame>
  );
}

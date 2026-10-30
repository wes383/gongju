import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { JsonDiffTool } from "@/components/tools/json-diff-tool";

const meta = getTool("json-diff")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="json-diff">
      <JsonDiffTool />
    </ToolFrame>
  );
}

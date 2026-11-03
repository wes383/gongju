import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { JsonRepairTool } from "@/components/tools/json-repair-tool";

const meta = getTool("json-repair")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="json-repair">
      <JsonRepairTool />
    </ToolFrame>
  );
}

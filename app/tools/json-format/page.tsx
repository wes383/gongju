import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { JsonFormatTool } from "@/components/tools/json-format-tool";

const meta = getTool("json-format")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="json-format">
      <JsonFormatTool />
    </ToolFrame>
  );
}

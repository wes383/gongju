import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { JsonToCodeTool } from "@/components/tools/json-to-code-tool";

const meta = getTool("json-to-code")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/json-to-code" },
};

export default function Page() {
  return (
    <ToolFrame slug="json-to-code">
      <JsonToCodeTool />
    </ToolFrame>
  );
}

import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { SchemaMarkupTool } from "@/components/tools/schema-markup-tool";

const meta = getTool("schema-markup")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/schema-markup" },
};

export default function Page() {
  return (
    <ToolFrame slug="schema-markup">
      <SchemaMarkupTool />
    </ToolFrame>
  );
}

import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { LlmCostTool } from "@/components/tools/llm-cost-tool";

const meta = getTool("llm-cost")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/llm-cost" },
};

export default function Page() {
  return (
    <ToolFrame slug="llm-cost">
      <LlmCostTool />
    </ToolFrame>
  );
}

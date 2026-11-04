import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { PromptTemplateTool } from "@/components/tools/prompt-template-tool";

const meta = getTool("prompt-template")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="prompt-template">
      <PromptTemplateTool />
    </ToolFrame>
  );
}

import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { UaParserTool } from "@/components/tools/ua-parser-tool";

const meta = getTool("ua-parser")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="ua-parser">
      <UaParserTool />
    </ToolFrame>
  );
}

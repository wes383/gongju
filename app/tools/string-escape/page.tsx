import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { StringEscapeTool } from "@/components/tools/string-escape-tool";

const meta = getTool("string-escape")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="string-escape">
      <StringEscapeTool />
    </ToolFrame>
  );
}

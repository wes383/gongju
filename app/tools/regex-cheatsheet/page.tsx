import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { RegexCheatsheetTool } from "@/components/tools/regex-cheatsheet-tool";

const meta = getTool("regex-cheatsheet")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="regex-cheatsheet">
      <RegexCheatsheetTool />
    </ToolFrame>
  );
}

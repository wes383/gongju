import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { RegexTesterTool } from "@/components/tools/regex-tester-tool";

const meta = getTool("regex-tester")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/regex-tester" },
};

export default function Page() {
  return (
    <ToolFrame slug="regex-tester">
      <RegexTesterTool />
    </ToolFrame>
  );
}

import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { TextCaseTool } from "@/components/tools/text-case-tool";

const meta = getTool("text-case")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/text-case" },
};

export default function Page() {
  return (
    <ToolFrame slug="text-case">
      <TextCaseTool />
    </ToolFrame>
  );
}

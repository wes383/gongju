import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { TextCleanTool } from "@/components/tools/text-clean-tool";

const meta = getTool("text-clean")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/text-clean" },
};

export default function Page() {
  return (
    <ToolFrame slug="text-clean">
      <TextCleanTool />
    </ToolFrame>
  );
}

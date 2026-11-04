import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { UaGeneratorTool } from "@/components/tools/ua-generator-tool";

const meta = getTool("ua-generator")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/ua-generator" },
};

export default function Page() {
  return (
    <ToolFrame slug="ua-generator">
      <UaGeneratorTool />
    </ToolFrame>
  );
}

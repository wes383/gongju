import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { PercentageTool } from "@/components/tools/percentage-tool";

const meta = getTool("percentage")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/percentage" },
};

export default function Page() {
  return (
    <ToolFrame slug="percentage">
      <PercentageTool />
    </ToolFrame>
  );
}

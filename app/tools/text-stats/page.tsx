import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { TextStatsTool } from "@/components/tools/text-stats-tool";

const meta = getTool("text-stats")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/text-stats" },
};

export default function Page() {
  return (
    <ToolFrame slug="text-stats">
      <TextStatsTool />
    </ToolFrame>
  );
}

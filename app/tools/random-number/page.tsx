import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { RandomNumberTool } from "@/components/tools/random-number-tool";

const meta = getTool("random-number")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/random-number" },
};

export default function Page() {
  return (
    <ToolFrame slug="random-number">
      <RandomNumberTool />
    </ToolFrame>
  );
}

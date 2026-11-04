import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { DiceTool } from "@/components/tools/dice-tool";

const meta = getTool("dice")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/dice" },
};

export default function Page() {
  return (
    <ToolFrame slug="dice">
      <DiceTool />
    </ToolFrame>
  );
}

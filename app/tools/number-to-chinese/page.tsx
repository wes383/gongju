import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { NumberToChineseTool } from "@/components/tools/number-to-chinese-tool";

const meta = getTool("number-to-chinese")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/number-to-chinese" },
};

export default function Page() {
  return (
    <ToolFrame slug="number-to-chinese">
      <NumberToChineseTool />
    </ToolFrame>
  );
}

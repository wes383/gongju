import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { CalculatorTool } from "@/components/tools/calculator-tool";

const meta = getTool("calculator")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/calculator" },
};

export default function Page() {
  return (
    <ToolFrame slug="calculator">
      <CalculatorTool />
    </ToolFrame>
  );
}

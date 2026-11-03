import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { SalaryTaxTool } from "@/components/tools/salary-tax-tool";

const meta = getTool("salary-tax")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="salary-tax">
      <SalaryTaxTool />
    </ToolFrame>
  );
}

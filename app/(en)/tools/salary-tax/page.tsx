import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ToolFrame } from "@/components/tools/tool-frame";
import { SalaryTaxTool } from "@/components/tools/salary-tax-tool";
import { toolMetadata } from "@/lib/page-meta";
import { toolJsonLd } from "@/lib/structured-data";
import { getTool } from "@/lib/tools";

const meta = getTool("salary-tax")!;

export const metadata: Metadata = toolMetadata(meta, "en");

export default function Page() {
  return (
    <ToolFrame slug="salary-tax">
      <JsonLd data={toolJsonLd(meta, "en")} />
      <SalaryTaxTool />
    </ToolFrame>
  );
}

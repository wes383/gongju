import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { CurrencyTool } from "@/components/tools/currency-tool";

const meta = getTool("currency")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="currency">
      <CurrencyTool />
    </ToolFrame>
  );
}

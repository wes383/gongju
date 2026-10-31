import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { CardLuhnTool } from "@/components/tools/card-luhn-tool";

const meta = getTool("card-luhn")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="card-luhn">
      <CardLuhnTool />
    </ToolFrame>
  );
}

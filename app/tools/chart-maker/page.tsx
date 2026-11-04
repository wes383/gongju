import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { ChartMakerTool } from "@/components/tools/chart-maker-tool";

const meta = getTool("chart-maker")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/chart-maker" },
};

export default function Page() {
  return (
    <ToolFrame slug="chart-maker">
      <ChartMakerTool />
    </ToolFrame>
  );
}

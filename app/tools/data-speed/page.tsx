import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { DataSpeedTool } from "@/components/tools/data-speed-tool";

const meta = getTool("data-speed")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="data-speed">
      <DataSpeedTool />
    </ToolFrame>
  );
}

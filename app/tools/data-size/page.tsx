import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { DataSizeTool } from "@/components/tools/data-size-tool";

const meta = getTool("data-size")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/data-size" },
};

export default function Page() {
  return (
    <ToolFrame slug="data-size">
      <DataSizeTool />
    </ToolFrame>
  );
}

import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { UnitConvertTool } from "@/components/tools/unit-convert-tool";

const meta = getTool("unit-convert")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/unit-convert" },
};

export default function Page() {
  return (
    <ToolFrame slug="unit-convert">
      <UnitConvertTool />
    </ToolFrame>
  );
}

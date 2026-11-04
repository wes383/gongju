import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { BmiTool } from "@/components/tools/bmi-tool";

const meta = getTool("bmi")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/bmi" },
};

export default function Page() {
  return (
    <ToolFrame slug="bmi">
      <BmiTool />
    </ToolFrame>
  );
}

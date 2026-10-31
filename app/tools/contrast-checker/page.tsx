import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { ContrastCheckerTool } from "@/components/tools/contrast-checker-tool";

const meta = getTool("contrast-checker")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="contrast-checker">
      <ContrastCheckerTool />
    </ToolFrame>
  );
}

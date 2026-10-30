import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { LunarTool } from "@/components/tools/lunar-tool";

const meta = getTool("lunar")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="lunar">
      <LunarTool />
    </ToolFrame>
  );
}

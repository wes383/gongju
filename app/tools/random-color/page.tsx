import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { RandomColorTool } from "@/components/tools/random-color-tool";

const meta = getTool("random-color")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/random-color" },
};

export default function Page() {
  return (
    <ToolFrame slug="random-color">
      <RandomColorTool />
    </ToolFrame>
  );
}

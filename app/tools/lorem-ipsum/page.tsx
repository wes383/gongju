import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { LoremTool } from "@/components/tools/lorem-tool";

const meta = getTool("lorem-ipsum")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="lorem-ipsum">
      <LoremTool />
    </ToolFrame>
  );
}

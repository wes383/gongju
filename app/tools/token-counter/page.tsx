import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { TokenCounterTool } from "@/components/tools/token-counter-tool";

const meta = getTool("token-counter")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="token-counter">
      <TokenCounterTool />
    </ToolFrame>
  );
}

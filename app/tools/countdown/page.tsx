import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { CountdownTool } from "@/components/tools/countdown-tool";

const meta = getTool("countdown")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="countdown">
      <CountdownTool />
    </ToolFrame>
  );
}

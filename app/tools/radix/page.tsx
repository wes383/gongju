import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { RadixTool } from "@/components/tools/radix-tool";

const meta = getTool("radix")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/radix" },
};

export default function Page() {
  return (
    <ToolFrame slug="radix">
      <RadixTool />
    </ToolFrame>
  );
}

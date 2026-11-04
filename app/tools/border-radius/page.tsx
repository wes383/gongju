import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { BorderRadiusTool } from "@/components/tools/border-radius-tool";

const meta = getTool("border-radius")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/border-radius" },
};

export default function Page() {
  return (
    <ToolFrame slug="border-radius">
      <BorderRadiusTool />
    </ToolFrame>
  );
}

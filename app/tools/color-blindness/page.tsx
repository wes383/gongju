import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { ColorBlindnessTool } from "@/components/tools/color-blindness-tool";

const meta = getTool("color-blindness")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/color-blindness" },
};

export default function Page() {
  return (
    <ToolFrame slug="color-blindness">
      <ColorBlindnessTool />
    </ToolFrame>
  );
}

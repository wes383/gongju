import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { MortgageTool } from "@/components/tools/mortgage-tool";

const meta = getTool("mortgage")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/mortgage" },
};

export default function Page() {
  return (
    <ToolFrame slug="mortgage">
      <MortgageTool />
    </ToolFrame>
  );
}

import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { TimezoneTool } from "@/components/tools/timezone-tool";

const meta = getTool("timezone")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/timezone" },
};

export default function Page() {
  return (
    <ToolFrame slug="timezone">
      <TimezoneTool />
    </ToolFrame>
  );
}

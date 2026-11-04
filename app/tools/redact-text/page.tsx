import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { RedactTextTool } from "@/components/tools/redact-text-tool";

const meta = getTool("redact-text")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/redact-text" },
};

export default function Page() {
  return (
    <ToolFrame slug="redact-text">
      <RedactTextTool />
    </ToolFrame>
  );
}

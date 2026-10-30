import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { TimestampTool } from "@/components/tools/timestamp-tool";

const meta = getTool("timestamp")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="timestamp">
      <TimestampTool />
    </ToolFrame>
  );
}

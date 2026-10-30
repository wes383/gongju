import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { UuidTool } from "@/components/tools/uuid-tool";

const meta = getTool("uuid")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="uuid">
      <UuidTool />
    </ToolFrame>
  );
}

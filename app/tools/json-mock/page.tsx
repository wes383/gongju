import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { JsonMockTool } from "@/components/tools/json-mock-tool";

const meta = getTool("json-mock")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/json-mock" },
};

export default function Page() {
  return (
    <ToolFrame slug="json-mock">
      <JsonMockTool />
    </ToolFrame>
  );
}

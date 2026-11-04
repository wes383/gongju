import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { JsonToCsvTool } from "@/components/tools/json-to-csv-tool";

const meta = getTool("json-to-csv")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/json-to-csv" },
};

export default function Page() {
  return (
    <ToolFrame slug="json-to-csv">
      <JsonToCsvTool />
    </ToolFrame>
  );
}

import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { JsonSchemaTool } from "@/components/tools/json-schema-tool";

const meta = getTool("json-schema")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/json-schema" },
};

export default function Page() {
  return (
    <ToolFrame slug="json-schema">
      <JsonSchemaTool />
    </ToolFrame>
  );
}

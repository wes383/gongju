import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { MimeTypeTool } from "@/components/tools/mime-type-tool";

const meta = getTool("mime-type")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/mime-type" },
};

export default function Page() {
  return (
    <ToolFrame slug="mime-type">
      <MimeTypeTool />
    </ToolFrame>
  );
}

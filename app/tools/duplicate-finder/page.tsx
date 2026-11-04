import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { DuplicateFinderTool } from "@/components/tools/duplicate-finder-tool";

const meta = getTool("duplicate-finder")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="duplicate-finder">
      <DuplicateFinderTool />
    </ToolFrame>
  );
}

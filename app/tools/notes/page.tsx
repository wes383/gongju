import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { NotesTool } from "@/components/tools/notes-tool";

const meta = getTool("notes")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="notes">
      <NotesTool />
    </ToolFrame>
  );
}

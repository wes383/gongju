import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { HmacTool } from "@/components/tools/hmac-tool";

const meta = getTool("hmac")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/hmac" },
};

export default function Page() {
  return (
    <ToolFrame slug="hmac">
      <HmacTool />
    </ToolFrame>
  );
}

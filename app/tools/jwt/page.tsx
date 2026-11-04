import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { JwtTool } from "@/components/tools/jwt-tool";

const meta = getTool("jwt")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/jwt" },
};

export default function Page() {
  return (
    <ToolFrame slug="jwt">
      <JwtTool />
    </ToolFrame>
  );
}

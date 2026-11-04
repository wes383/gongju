import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { TotpTool } from "@/components/tools/totp-tool";

const meta = getTool("totp")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/totp" },
};

export default function Page() {
  return (
    <ToolFrame slug="totp">
      <TotpTool />
    </ToolFrame>
  );
}

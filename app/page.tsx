import type { Metadata } from "next";
import { ToolDirectory } from "@/components/site/tool-directory";

// Canonical lives on the page rather than the root layout: a layout-level
// canonical is inherited by every route, which would point all 163 tool pages
// at the home page and fold them away in search results.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return <ToolDirectory />;
}

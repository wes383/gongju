import type { Metadata } from "next";
import { PrivacyContent } from "@/components/site/privacy-content";
import { privacyMetadata } from "@/lib/page-meta";

export const metadata: Metadata = privacyMetadata("en");

export default function PrivacyPage() {
  return <PrivacyContent />;
}
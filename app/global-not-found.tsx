import type { Metadata } from "next";
import { fontVariables } from "@/components/site/fonts";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Page Not Found · GongJu",
  robots: { index: false },
};

/** Unmatched URLs bypass the locale layouts, so this document stands alone */
export default function GlobalNotFound() {
  return (
    <html lang="en" className={fontVariables}>
      <body className="min-h-screen font-sans antialiased">
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-5 text-center">
          <p className="font-mono text-sm text-foreground-faint">404</p>
          <h1 className="font-display text-lg font-bold text-foreground">
            This page does not exist
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-foreground-muted">
            The address has no matching tool. The link may be outdated or misspelled.
          </p>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- this document renders outside the app router, so a plain anchor forces the full load home */}
          <a
            href="/"
            className="inline-flex h-9 items-center rounded-full border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors duration-base ease-out hover:bg-hover-bg"
          >
            Back to the toolbox
          </a>
        </div>
      </body>
    </html>
  );
}
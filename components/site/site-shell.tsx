import { JsonLd } from "@/components/site/json-ld";
import { fontVariables } from "@/components/site/fonts";
import { ThemeProvider } from "@/components/theme-provider";
import { LocaleProvider } from "@/components/locale-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { htmlLang, type Locale } from "@/lib/i18n";
import { siteJsonLd } from "@/lib/structured-data";
import "@/app/globals.css";

/** Shared html/body shell for the per-locale root layouts */
export function SiteShell({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return (
    <html lang={htmlLang[locale]} suppressHydrationWarning className={fontVariables}>
      <body className="min-h-screen font-sans antialiased">
        {/* Site-wide graph: every tool page points back to these @ids */}
        <JsonLd data={siteJsonLd(locale)} />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <LocaleProvider locale={locale}>
            <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
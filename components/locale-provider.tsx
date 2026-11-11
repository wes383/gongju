"use client";

import * as React from "react";
import { dict, type Dict, type Locale } from "@/lib/i18n";

const LocaleContext = React.createContext<Locale>("en");

/** The locale is owned by the URL and handed down by the root layout */
export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return React.useContext(LocaleContext);
}

/** Shared UI strings for the active locale */
export function useT(): Dict {
  return dict[useLocale()];
}

/** Pick the active locale out of an inline per-component copy table */
export function useCopy<T>(copy: Record<Locale, T>): T {
  return copy[useLocale()];
}
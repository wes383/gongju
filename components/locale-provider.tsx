"use client";

import * as React from "react";
import {
  dict,
  htmlLang,
  LOCALE_STORAGE_KEY,
  type Dict,
  type Locale,
} from "@/lib/i18n";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
}

const LocaleContext = React.createContext<LocaleContextValue>({
  locale: "zh",
  setLocale: () => {},
});

// Layout effect so the stored locale is applied before the first paint,
// while the initial render still matches the server output.
const useIsoLayoutEffect = typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<Locale>("zh");

  useIsoLayoutEffect(() => {
    try {
      const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
      if (stored === "en" || stored === "zh") setLocaleState(stored);
    } catch {
      /* localStorage unavailable */
    }
  }, []);

  const setLocale = React.useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  React.useEffect(() => {
    document.documentElement.lang = htmlLang[locale];
  }, [locale]);

  const value = React.useMemo(() => ({ locale, setLocale }), [locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return React.useContext(LocaleContext).locale;
}

export function useSetLocale(): (next: Locale) => void {
  return React.useContext(LocaleContext).setLocale;
}

/** Shared UI strings for the active locale */
export function useT(): Dict {
  return dict[useLocale()];
}

/** Pick the active locale out of an inline per-component copy table */
export function useCopy<T>(copy: Record<Locale, T>): T {
  return copy[useLocale()];
}

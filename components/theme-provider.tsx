"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import type { ThemeProviderProps } from "next-themes";

/**
 * Orkest UI ThemeProvider
 *
 * Wraps next-themes to provide:
 * - Light / Dark / High Contrast modes
 * - System preference detection
 * - Persistence to localStorage (theme via next-themes, high contrast below)
 * - Runtime theme switching via CSS variables
 *
 * @example
 * <ThemeProvider defaultTheme="system" enableSystem>
 *   <App />
 * </ThemeProvider>
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      <HighContrastProvider>{children}</HighContrastProvider>
    </NextThemesProvider>
  );
}

/**
 * Unified appearance state: merges "light/dark" and "high-contrast on/off" into a
 * single enum to avoid unexpected combinations from two independent booleans during switching.
 *
 * - `light`             — normal light
 * - `dark`              — normal dark
 * - `light-hc`          — light + high contrast
 * - `dark-hc`           — dark + high contrast
 */
export type Appearance = "light" | "dark" | "light-hc" | "dark-hc";

const HC_STORAGE_KEY = "orkest-high-contrast";

interface HighContrastContextValue {
  highContrast: boolean;
  setHighContrast: (next: boolean | ((prev: boolean) => boolean)) => void;
}

const HighContrastContext = React.createContext<HighContrastContextValue | null>(
  null
);

function applyHighContrastClass(value: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("high-contrast", value);
}

/**
 * HighContrastProvider — app-level shared high-contrast state.
 *
 * Keeps the boolean in one context so every `useAppTheme()` caller sees the same
 * value, and persists it to localStorage so the choice survives reloads.
 */
function HighContrastProvider({ children }: { children: React.ReactNode }) {
  const [highContrast, setState] = React.useState(false);
  // Suppress persistence until the stored value has been restored, otherwise
  // the mount-time effect would overwrite it with the default.
  const hydratedRef = React.useRef(false);

  // Restore persisted choice once on mount and apply the class immediately.
  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(HC_STORAGE_KEY);
      if (stored === "true" || stored === "false") {
        applyHighContrastClass(stored === "true");
        setState(stored === "true");
      }
    } catch {
      /* ignore: localStorage unavailable */
    }
    hydratedRef.current = true;
  }, []);

  // Apply the class and persist on every change after hydration.
  React.useEffect(() => {
    if (!hydratedRef.current) return;
    applyHighContrastClass(highContrast);
    try {
      window.localStorage.setItem(HC_STORAGE_KEY, String(highContrast));
    } catch {
      /* ignore */
    }
  }, [highContrast]);

  const setHighContrast = React.useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      setState(next);
    },
    []
  );

  const value = React.useMemo<HighContrastContextValue>(
    () => ({ highContrast, setHighContrast }),
    [highContrast, setHighContrast]
  );

  return (
    <HighContrastContext.Provider value={value}>
      {children}
    </HighContrastContext.Provider>
  );
}

/**
 * useAppTheme — extended theme hook.
 *
 * Recommended API: use `appearance` + `setAppearance` (single state, no combination ambiguity).
 * The legacy `setTheme` / `setHighContrast` / `toggleTheme` / `toggleHighContrast`
 * are kept for backward compatibility and delegate to `setAppearance` internally.
 */
export function useAppTheme() {
  const { theme, setTheme, resolvedTheme, systemTheme } = useTheme();
  const ctx = React.useContext(HighContrastContext);
  // Fallback local state for callers rendered outside <ThemeProvider>;
  // inside the provider all callers share one persisted value.
  const [localHighContrast, setLocalHighContrast] = React.useState(false);

  const highContrast = ctx ? ctx.highContrast : localHighContrast;
  const setHighContrast = ctx ? ctx.setHighContrast : setLocalHighContrast;

  React.useEffect(() => {
    if (ctx) return; // class is managed by HighContrastProvider
    applyHighContrastClass(localHighContrast);
  }, [ctx, localHighContrast]);

  const isDark = resolvedTheme === "dark";

  /** Current unified appearance (derived from resolvedTheme + highContrast). */
  const appearance: Appearance = isDark
    ? highContrast
      ? "dark-hc"
      : "dark"
    : highContrast
    ? "light-hc"
    : "light";

  /** Set the unified appearance, updating both the dark class and the high-contrast class. */
  const setAppearance = React.useCallback(
    (next: Appearance) => {
      const nextDark = next === "dark" || next === "dark-hc";
      const nextHc = next === "light-hc" || next === "dark-hc";
      setTheme(nextDark ? "dark" : "light");
      setHighContrast(nextHc);
    },
    [setTheme, setHighContrast]
  );

  const toggleHighContrast = React.useCallback(() => {
    setHighContrast((v) => !v);
  }, [setHighContrast]);

  const toggleTheme = React.useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  return {
    theme,
    resolvedTheme,
    systemTheme,
    setTheme,
    toggleTheme,
    highContrast,
    setHighContrast,
    toggleHighContrast,
    /** Recommended unified appearance API. */
    appearance,
    setAppearance,
    isDark,
    isLight: resolvedTheme === "light",
  };
}

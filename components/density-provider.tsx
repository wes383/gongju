"use client";

import * as React from "react";

/**
 * Global density tiers.
 *
 * `default` matches the built-in sizing of every component. `compact` and
 * `comfortable` shift density-aware components one tier up or down. Individual
 * components can still opt out by passing an explicit `size` / `density` prop.
 */
export type Density = "compact" | "default" | "comfortable";

interface DensityContextValue {
  density: Density;
  setDensity: (density: Density) => void;
}

const DensityContext = React.createContext<DensityContextValue | null>(null);

const STORAGE_KEY = "orkest-density";

const isDensity = (value: unknown): value is Density =>
  value === "compact" || value === "default" || value === "comfortable";

interface DensityProviderProps {
  children: React.ReactNode;
  /** First-paint density before the stored value is read on mount. Defaults to "default". */
  initialDensity?: Density;
}

/**
 * DensityProvider — makes one density choice available to every density-aware
 * component in the tree, e.g. to give a data-heavy app a global compact mode.
 *
 * - Persists the choice to `orkest-density` in localStorage.
 * - Optional: components render without it and fall back to "default", so it is
 *   safe to only mount it where a switch is actually offered.
 */
export function DensityProvider({
  children,
  initialDensity = "default",
}: DensityProviderProps) {
  const [density, setDensityState] = React.useState<Density>(initialDensity);

  // Read the stored value after mount so SSR and the first client render agree.
  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (isDensity(stored)) {
        setDensityState((prev) => (prev === stored ? prev : stored));
      }
    } catch {
      /* ignore: localStorage unavailable */
    }
  }, []);

  const setDensity = React.useCallback((next: Density) => {
    setDensityState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const value = React.useMemo<DensityContextValue>(
    () => ({ density, setDensity }),
    [density, setDensity]
  );

  return (
    <DensityContext.Provider value={value}>{children}</DensityContext.Provider>
  );
}

/**
 * Reads the surrounding density, falling back to "default" when no provider is
 * mounted. This is the hook component internals use, so the library stays
 * usable without a provider.
 */
export function useDensity(): Density {
  return React.useContext(DensityContext)?.density ?? "default";
}

/**
 * Reads and updates the density. Throws when no provider is mounted — use this
 * from a density switch, which is meaningless outside a `<DensityProvider>`.
 */
export function useDensityMode(): DensityContextValue {
  const ctx = React.useContext(DensityContext);
  if (!ctx) {
    throw new Error("useDensityMode must be used within <DensityProvider>");
  }
  return ctx;
}

export { DensityContext, STORAGE_KEY as DENSITY_STORAGE_KEY };

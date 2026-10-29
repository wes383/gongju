import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Orkest UI components are vendored verbatim; keep their original style
    files: [
      "components/ui/**/*.{ts,tsx}",
      "components/theme-provider.tsx",
      "components/density-provider.tsx",
      "lib/utils.ts",
    ],
    rules: {
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Reference implementation, excluded from this project's lint and typecheck
    "orkest-ui/**",
  ]),
]);

export default eslintConfig;

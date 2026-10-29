import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Orkest UI 组件按原样拷贝进来维护，保留其原有写法
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
    // Orkest UI 参考实现，不参与本项目的 lint / 类型检查
    "orkest-ui/**",
  ]),
]);

export default eslintConfig;

/**
 * .gitignore composer: a catalogue of language / editor / OS blocks that are
 * merged into one file without duplicate lines.
 */

export interface IgnoreGroup {
  id: string;
  label: { zh: string; en: string };
  patterns: string[];
  /** Groups shown first as "most used" */
  popular?: boolean;
}

export const IGNORE_GROUPS: IgnoreGroup[] = [
  {
    id: "node",
    label: { zh: "Node.js", en: "Node.js" },
    popular: true,
    patterns: [
      "node_modules/",
      ".pnpm-store/",
      "npm-debug.log*",
      "yarn-debug.log*",
      "yarn-error.log*",
      ".pnp.*",
    ],
  },
  {
    id: "next",
    label: { zh: "Next.js", en: "Next.js" },
    popular: true,
    patterns: [".next/", "out/", "next-env.d.ts", ".vercel"],
  },
  {
    id: "vite",
    label: { zh: "Vite", en: "Vite" },
    popular: true,
    patterns: ["dist/", "dist-ssr/", ".vite/", "*.local"],
  },
  {
    id: "python",
    label: { zh: "Python", en: "Python" },
    popular: true,
    patterns: [
      "__pycache__/",
      "*.py[cod]",
      ".venv/",
      "venv/",
      "*.egg-info/",
      ".pytest_cache/",
      ".mypy_cache/",
      ".ruff_cache/",
    ],
  },
  {
    id: "java",
    label: { zh: "Java / Gradle", en: "Java / Gradle" },
    patterns: [
      "*.class",
      "target/",
      "build/",
      ".gradle/",
      "!gradle/wrapper/gradle-wrapper.jar",
    ],
  },
  {
    id: "go",
    label: { zh: "Go", en: "Go" },
    patterns: ["*.exe", "*.test", "*.out", "coverage.txt"],
  },
  {
    id: "rust",
    label: { zh: "Rust", en: "Rust" },
    patterns: ["target/", "**/*.rs.bk"],
  },
  {
    id: "cpp",
    label: { zh: "C / C++", en: "C / C++" },
    patterns: ["*.o", "*.obj", "*.so", "*.a", "build/", "cmake-build-*/"],
  },
  {
    id: "dotenv",
    label: { zh: "环境变量", en: "Env files" },
    popular: true,
    patterns: [".env", ".env.local", ".env.*.local", "!.env.example"],
  },
  {
    id: "logs",
    label: { zh: "日志", en: "Logs" },
    patterns: ["logs/", "*.log", "*.pid", "*.seed"],
  },
  {
    id: "vscode",
    label: { zh: "VS Code", en: "VS Code" },
    patterns: [".vscode/*", "!.vscode/extensions.json", "!.vscode/settings.json"],
  },
  {
    id: "jetbrains",
    label: { zh: "JetBrains", en: "JetBrains" },
    patterns: [".idea/", "*.iml", "*.ipr", "*.iws"],
  },
  {
    id: "macos",
    label: { zh: "macOS", en: "macOS" },
    popular: true,
    patterns: [".DS_Store", "._*", ".Spotlight-V100", ".Trashes"],
  },
  {
    id: "windows",
    label: { zh: "Windows", en: "Windows" },
    popular: true,
    patterns: ["Thumbs.db", "ehthumbs.db", "Desktop.ini", "$RECYCLE.BIN/"],
  },
  {
    id: "linux",
    label: { zh: "Linux", en: "Linux" },
    patterns: ["*~", ".directory", ".fuse_hidden*"],
  },
  {
    id: "terraform",
    label: { zh: "Terraform", en: "Terraform" },
    patterns: [".terraform/", "*.tfstate", "*.tfstate.*", "crash.log"],
  },
];

export const DEFAULT_IGNORE = ["node", "next", "dotenv", "logs", "vscode", "macos", "windows"];

/**
 * Merge the selected blocks. A later negation such as `!.env.example` is kept
 * even though `.env` is already present, because they are different rules.
 */
export function buildGitignore(selected: string[], locale: "zh" | "en" = "en"): string {
  const chosen = IGNORE_GROUPS.filter((group) => selected.includes(group.id));
  const seen = new Set<string>();
  const blocks: string[] = [];

  for (const group of chosen) {
    const lines: string[] = [];
    for (const pattern of group.patterns) {
      if (seen.has(pattern)) continue;
      seen.add(pattern);
      lines.push(pattern);
    }
    if (lines.length > 0) {
      blocks.push(`# ${group.label[locale]}\n${lines.join("\n")}`);
    }
  }

  return blocks.join("\n\n") + (blocks.length > 0 ? "\n" : "");
}

export function groupLabel(group: IgnoreGroup, locale: "zh" | "en"): string {
  return group.label[locale];
}

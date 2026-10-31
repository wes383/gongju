/**
 * .gitignore composer: a catalogue of language / editor / OS blocks that are
 * merged into one file without duplicate lines.
 */

export interface IgnoreGroup {
  id: string;
  label: { zh: string; en: string };
  patterns: string[];
}

export const IGNORE_GROUPS: IgnoreGroup[] = [
  {
    id: "node",
    label: { zh: "Node.js", en: "Node.js" },
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
    patterns: [".next/", "out/", "next-env.d.ts", ".vercel"],
  },
  {
    id: "vite",
    label: { zh: "Vite", en: "Vite" },
    patterns: ["dist/", "dist-ssr/", ".vite/", "*.local"],
  },
  {
    id: "python",
    label: { zh: "Python", en: "Python" },
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
    id: "react-native",
    label: { zh: "React Native / Expo", en: "React Native / Expo" },
    patterns: [
      ".expo/",
      ".expo-shared/",
      "android/.gradle/",
      "android/app/build/",
      "ios/build/",
      "ios/Pods/",
      "*.jks",
      "*.keystore",
    ],
  },
  {
    id: "flutter",
    label: { zh: "Flutter / Dart", en: "Flutter / Dart" },
    patterns: [
      ".dart_tool/",
      ".flutter-plugins",
      ".flutter-plugins-dependencies",
      "*.g.dart",
      "*.freezed.dart",
      "build/",
    ],
  },
  {
    id: "swift",
    label: { zh: "Swift / Xcode", en: "Swift / Xcode" },
    patterns: [
      "DerivedData/",
      "*.xcuserstate",
      "xcuserdata/",
      "Pods/",
      ".build/",
    ],
  },
  {
    id: "dotnet",
    label: { zh: ".NET", en: ".NET" },
    patterns: ["bin/", "obj/", "*.user", "*.suo", ".vs/", "*.nupkg"],
  },
  {
    id: "php",
    label: { zh: "PHP / Laravel", en: "PHP / Laravel" },
    patterns: ["vendor/", "storage/*.key", ".phpunit.result.cache", ".php-cs-fixer.cache"],
  },
  {
    id: "ruby",
    label: { zh: "Ruby / Rails", en: "Ruby / Rails" },
    patterns: [".bundle/", "log/", "tmp/", "vendor/bundle/", ".byebug_history"],
  },
  {
    id: "frontend",
    label: { zh: "其它前端框架", en: "Other frontend" },
    patterns: [
      ".angular/",
      ".svelte-kit/",
      ".nuxt/",
      ".astro/",
      ".output/",
      "storybook-static/",
    ],
  },
  {
    id: "dotenv",
    label: { zh: "环境变量", en: "Env files" },
    patterns: [".env", ".env.local", ".env.*.local", "!.env.example"],
  },
  {
    id: "secrets",
    label: { zh: "密钥文件", en: "Key files" },
    patterns: ["*.pem", "*.key", "*.p12", "*.pfx", "id_rsa", "id_ed25519"],
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
    patterns: [".DS_Store", "._*", ".Spotlight-V100", ".Trashes"],
  },
  {
    id: "windows",
    label: { zh: "Windows", en: "Windows" },
    patterns: ["Thumbs.db", "ehthumbs.db", "Desktop.ini", "$RECYCLE.BIN/"],
  },
  {
    id: "linux",
    label: { zh: "Linux", en: "Linux" },
    patterns: ["*~", ".directory", ".fuse_hidden*"],
  },
  {
    id: "cache",
    label: { zh: "构建缓存", en: "Build cache" },
    patterns: [
      ".cache/",
      ".turbo/",
      ".parcel-cache/",
      ".eslintcache",
      ".stylelintcache",
      "*.tsbuildinfo",
    ],
  },
  {
    id: "coverage",
    label: { zh: "测试覆盖率", en: "Coverage" },
    patterns: ["coverage/", ".nyc_output/", "*.lcov", "junit.xml"],
  },
  {
    id: "database",
    label: { zh: "本地数据库", en: "Local database" },
    patterns: ["*.sqlite", "*.sqlite3", "*.db", "*.db-journal", "dump.rdb"],
  },
  {
    id: "terraform",
    label: { zh: "Terraform", en: "Terraform" },
    patterns: [".terraform/", "*.tfstate", "*.tfstate.*", "crash.log"],
  },
];

export const DEFAULT_IGNORE = ["node", "next", "dotenv", "logs", "vscode", "macos", "windows"];

const EXTRA_LABEL = { zh: "自定义", en: "Custom" };

/** Split the free-text box into usable patterns: one per line, blanks and comments dropped. */
export function parseExtraRules(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

/**
 * Merge the selected blocks. A later negation such as `!.env.example` is kept
 * even though `.env` is already present, because they are different rules.
 */
export function buildGitignore(
  selected: string[],
  locale: "zh" | "en" = "en",
  extra = ""
): string {
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

  const extraLines: string[] = [];
  for (const line of parseExtraRules(extra)) {
    if (seen.has(line)) continue;
    seen.add(line);
    extraLines.push(line);
  }
  if (extraLines.length > 0) {
    blocks.push(`# ${EXTRA_LABEL[locale]}\n${extraLines.join("\n")}`);
  }

  return blocks.join("\n\n") + (blocks.length > 0 ? "\n" : "");
}

export function groupLabel(group: IgnoreGroup, locale: "zh" | "en"): string {
  return group.label[locale];
}

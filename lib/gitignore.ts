/**
 * .gitignore composer: a catalogue of language / framework / editor / OS blocks
 * grouped by category, plus shortcut presets that pick several blocks at once.
 */

export type IgnoreCategoryId =
  | "language"
  | "framework"
  | "ide"
  | "os"
  | "build"
  | "devops"
  | "project"
  | "general";

export interface IgnoreCategory {
  id: IgnoreCategoryId;
  label: { zh: string; en: string };
}

export interface IgnoreGroup {
  id: string;
  category: IgnoreCategoryId;
  label: { zh: string; en: string };
  patterns: string[];
}

export interface IgnorePreset {
  id: string;
  label: { zh: string; en: string };
  groups: string[];
}

export const IGNORE_CATEGORIES: IgnoreCategory[] = [
  { id: "language", label: { zh: "编程语言", en: "Languages" } },
  { id: "framework", label: { zh: "框架与平台", en: "Frameworks & Platforms" } },
  { id: "ide", label: { zh: "IDE 与编辑器", en: "IDEs & Editors" } },
  { id: "os", label: { zh: "操作系统", en: "Operating Systems" } },
  { id: "build", label: { zh: "构建工具", en: "Build Tools" } },
  { id: "devops", label: { zh: "DevOps 与基础设施", en: "DevOps & Infrastructure" } },
  { id: "project", label: { zh: "项目类型", en: "Project Types" } },
  { id: "general", label: { zh: "通用规则", en: "General Rules" } },
];

export const IGNORE_GROUPS: IgnoreGroup[] = [
  // ---------------------------------------------------------------- languages
  {
    id: "node",
    category: "language",
    label: { zh: "JavaScript / Node.js", en: "JavaScript / Node.js" },
    patterns: [
      "node_modules/",
      ".pnpm-store/",
      ".yarn/",
      "npm-debug.log*",
      "yarn-debug.log*",
      "yarn-error.log*",
      ".pnp.*",
    ],
  },
  {
    id: "typescript",
    category: "language",
    label: { zh: "TypeScript", en: "TypeScript" },
    patterns: ["*.tsbuildinfo", ".tsbuildinfo"],
  },
  {
    id: "python",
    category: "language",
    label: { zh: "Python", en: "Python" },
    patterns: [
      "__pycache__/",
      "*.py[cod]",
      ".venv/",
      "venv/",
      ".tox/",
      "*.egg-info/",
      ".pytest_cache/",
      ".mypy_cache/",
      ".ruff_cache/",
    ],
  },
  {
    id: "java",
    category: "language",
    label: { zh: "Java", en: "Java" },
    patterns: ["*.class", "target/", "hs_err_pid*", "replay_pid*"],
  },
  {
    id: "go",
    category: "language",
    label: { zh: "Go", en: "Go" },
    patterns: ["*.exe", "*.test", "*.out", "coverage.txt"],
  },
  {
    id: "rust",
    category: "language",
    label: { zh: "Rust", en: "Rust" },
    patterns: ["target/", "**/*.rs.bk"],
  },
  {
    id: "cpp",
    category: "language",
    label: { zh: "C / C++", en: "C / C++" },
    patterns: ["*.o", "*.obj", "*.so", "*.a", "*.dylib", "*.dll", "*.pdb", "cmake-build-*/"],
  },
  {
    id: "csharp",
    category: "language",
    label: { zh: "C# / .NET", en: "C# / .NET" },
    patterns: ["bin/", "obj/", "*.user", "*.suo", "*.nupkg", "packages/"],
  },
  {
    id: "php",
    category: "language",
    label: { zh: "PHP", en: "PHP" },
    patterns: ["vendor/", "storage/*.key", ".phpunit.result.cache", ".php-cs-fixer.cache"],
  },
  {
    id: "ruby",
    category: "language",
    label: { zh: "Ruby", en: "Ruby" },
    patterns: [".bundle/", "log/", "tmp/", "vendor/bundle/", ".byebug_history"],
  },
  {
    id: "swift",
    category: "language",
    label: { zh: "Swift", en: "Swift" },
    patterns: [".build/", "Pods/", "*.dSYM", "*.dSYM.zip", ".swiftpm/"],
  },
  {
    id: "kotlin",
    category: "language",
    label: { zh: "Kotlin", en: "Kotlin" },
    patterns: [".kotlin/", "*.hprof"],
  },
  {
    id: "dart",
    category: "language",
    label: { zh: "Dart / Flutter", en: "Dart / Flutter" },
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
    id: "r",
    category: "language",
    label: { zh: "R", en: "R" },
    patterns: [".Rhistory", ".Rapp.history", ".RData", ".Ruserdata", ".Rproj.user/"],
  },
  {
    id: "julia",
    category: "language",
    label: { zh: "Julia", en: "Julia" },
    patterns: [".julia/", "*.jl.cov", "*.jl.*.cov", "*.jl.mem"],
  },
  {
    id: "elixir",
    category: "language",
    label: { zh: "Elixir / Erlang", en: "Elixir / Erlang" },
    patterns: ["_build/", "deps/", "erl_crash.dump", "*.ez", ".elixir_ls/"],
  },
  {
    id: "scala",
    category: "language",
    label: { zh: "Scala", en: "Scala" },
    patterns: [".bloop/", ".metals/", ".scala-build/", "project/target/", "project/project/"],
  },
  {
    id: "perl",
    category: "language",
    label: { zh: "Perl", en: "Perl" },
    patterns: ["blib/", "pm_to_blib", "*.pm.bak"],
  },
  {
    id: "lua",
    category: "language",
    label: { zh: "Lua", en: "Lua" },
    patterns: ["*.luac", "luac.out"],
  },

  // --------------------------------------------------------------- frameworks
  {
    id: "next",
    category: "framework",
    label: { zh: "Next.js", en: "Next.js" },
    patterns: [".next/", "out/", "next-env.d.ts", ".vercel"],
  },
  {
    id: "vite",
    category: "framework",
    label: { zh: "Vite", en: "Vite" },
    patterns: ["dist/", "dist-ssr/", ".vite/", "*.local"],
  },
  {
    id: "react-native",
    category: "framework",
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
    id: "android",
    category: "framework",
    label: { zh: "Android", en: "Android" },
    patterns: [
      "local.properties",
      "captures/",
      ".externalNativeBuild/",
      ".cxx/",
      "*.apk",
      "*.aab",
      "*.jks",
      "*.keystore",
    ],
  },
  {
    id: "frontend",
    category: "framework",
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

  // ---------------------------------------------------------------------- ides
  {
    id: "vscode",
    category: "ide",
    label: { zh: "VS Code", en: "VS Code" },
    patterns: [".vscode/*", "!.vscode/extensions.json", "!.vscode/settings.json"],
  },
  {
    id: "jetbrains",
    category: "ide",
    label: { zh: "JetBrains", en: "JetBrains" },
    patterns: [".idea/", "*.iml", "*.ipr", "*.iws"],
  },
  {
    id: "visualstudio",
    category: "ide",
    label: { zh: "Visual Studio", en: "Visual Studio" },
    patterns: [".vs/", "*.userprefs", "*.aps", "*.DBMDL", "*.publishsettings"],
  },
  {
    id: "eclipse",
    category: "ide",
    label: { zh: "Eclipse", en: "Eclipse" },
    patterns: [".settings/", ".classpath", ".project", ".metadata/", ".factorypath"],
  },
  {
    id: "xcode",
    category: "ide",
    label: { zh: "Xcode", en: "Xcode" },
    patterns: [
      "DerivedData/",
      "*.xcuserstate",
      "xcuserdata/",
      "*.xcscmblueprint",
      "*.xccheckout",
      "*.moved-aside",
      "*.hmap",
      "*.ipa",
    ],
  },
  {
    id: "vim",
    category: "ide",
    label: { zh: "Vim", en: "Vim" },
    patterns: ["*.swp", "*.swo", "*.swn", ".viminfo", ".netrwhist"],
  },
  {
    id: "emacs",
    category: "ide",
    label: { zh: "Emacs", en: "Emacs" },
    patterns: ["*~", "\\#*\\#", ".#*", ".emacs.desktop"],
  },
  {
    id: "sublime",
    category: "ide",
    label: { zh: "Sublime Text", en: "Sublime Text" },
    patterns: ["*.sublime-workspace"],
  },
  {
    id: "zed",
    category: "ide",
    label: { zh: "Zed", en: "Zed" },
    patterns: [".zed/", ".zed_server/"],
  },

  // ------------------------------------------------------------------------ os
  {
    id: "macos",
    category: "os",
    label: { zh: "macOS", en: "macOS" },
    patterns: [".DS_Store", "._*", ".Spotlight-V100", ".Trashes"],
  },
  {
    id: "windows",
    category: "os",
    label: { zh: "Windows", en: "Windows" },
    patterns: ["Thumbs.db", "ehthumbs.db", "Desktop.ini", "$RECYCLE.BIN/"],
  },
  {
    id: "linux",
    category: "os",
    label: { zh: "Linux", en: "Linux" },
    patterns: [".directory", ".fuse_hidden*", ".Trash-*"],
  },

  // --------------------------------------------------------------------- build
  {
    id: "maven",
    category: "build",
    label: { zh: "Maven", en: "Maven" },
    patterns: ["pom.xml.tag", "pom.xml.releaseBackup", "pom.xml.versionsBackup", "release.properties"],
  },
  {
    id: "gradle",
    category: "build",
    label: { zh: "Gradle", en: "Gradle" },
    patterns: [
      ".gradle/",
      "build/",
      "!gradle/wrapper/gradle-wrapper.jar",
      ".gradletasknamecache",
      "gradle-app.setting",
    ],
  },
  {
    id: "cmake",
    category: "build",
    label: { zh: "CMake", en: "CMake" },
    patterns: ["CMakeFiles/", "CMakeCache.txt", "cmake_install.cmake", "install_manifest.txt"],
  },
  {
    id: "webpack",
    category: "build",
    label: { zh: "Webpack", en: "Webpack" },
    patterns: ["dist/", ".cache-loader/"],
  },

  // -------------------------------------------------------------------- devops
  {
    id: "terraform",
    category: "devops",
    label: { zh: "Terraform", en: "Terraform" },
    patterns: [
      ".terraform/",
      "*.tfstate",
      "*.tfstate.*",
      "crash.log",
      "*.tfvars.json",
      "!/.terraform.lock.hcl",
    ],
  },
  {
    id: "serverless",
    category: "devops",
    label: { zh: "Serverless", en: "Serverless" },
    patterns: [".serverless/", ".serverless_plugins/", ".aws-sam/"],
  },
  {
    id: "ansible",
    category: "devops",
    label: { zh: "Ansible", en: "Ansible" },
    patterns: ["*.retry", ".ansible/"],
  },
  {
    id: "packer",
    category: "devops",
    label: { zh: "Packer", en: "Packer" },
    patterns: ["packer_cache/", "*.box"],
  },
  {
    id: "helm",
    category: "devops",
    label: { zh: "Helm", en: "Helm" },
    patterns: ["charts/*.tgz"],
  },

  // ------------------------------------------------------------------- project
  {
    id: "jupyter",
    category: "project",
    label: { zh: "Jupyter", en: "Jupyter" },
    patterns: [".ipynb_checkpoints/", "*.nbconvert.ipynb", ".virtual_documents/"],
  },
  {
    id: "unity",
    category: "project",
    label: { zh: "Unity", en: "Unity" },
    patterns: [
      "Library/",
      "Temp/",
      "Obj/",
      "Logs/",
      "UserSettings/",
      "MemoryCaptures/",
      "Recordings/",
    ],
  },
  {
    id: "unreal",
    category: "project",
    label: { zh: "Unreal Engine", en: "Unreal Engine" },
    patterns: [
      "Binaries/",
      "Intermediate/",
      "Saved/",
      "DerivedDataCache/",
      "*.VC.db",
      "*.opensdf",
      "*.sdf",
    ],
  },
  {
    id: "godot",
    category: "project",
    label: { zh: "Godot", en: "Godot" },
    patterns: [".godot/", "export.cfg", "*.translation"],
  },
  {
    id: "hugo",
    category: "project",
    label: { zh: "Hugo", en: "Hugo" },
    patterns: ["public/", "resources/_gen/", ".hugo_build.lock"],
  },
  {
    id: "jekyll",
    category: "project",
    label: { zh: "Jekyll", en: "Jekyll" },
    patterns: ["_site/", ".jekyll-cache/", ".jekyll-metadata"],
  },
  {
    id: "wordpress",
    category: "project",
    label: { zh: "WordPress", en: "WordPress" },
    patterns: ["wp-config.php", "wp-content/uploads/", "wp-content/cache/", "wp-content/upgrade/"],
  },
  {
    id: "latex",
    category: "project",
    label: { zh: "LaTeX", en: "LaTeX" },
    patterns: [
      "*.aux",
      "*.bbl",
      "*.blg",
      "*.toc",
      "*.fls",
      "*.fdb_latexmk",
      "*.synctex.gz",
      "*.xdv",
    ],
  },

  // ------------------------------------------------------------------- general
  {
    id: "dotenv",
    category: "general",
    label: { zh: "环境变量", en: "Env files" },
    patterns: [".env*", "!.env.example", "!.env.sample", "!.env.template"],
  },
  {
    id: "secrets",
    category: "general",
    label: { zh: "密钥文件", en: "Key files" },
    patterns: ["*.pem", "*.key", "*.p12", "*.pfx", "id_rsa", "id_ed25519"],
  },
  {
    id: "logs",
    category: "general",
    label: { zh: "日志", en: "Logs" },
    patterns: ["logs/", "*.log", "*.pid", "*.seed"],
  },
  {
    id: "cache",
    category: "general",
    label: { zh: "构建缓存", en: "Build cache" },
    patterns: [".cache/", ".turbo/", ".parcel-cache/", ".eslintcache", ".stylelintcache"],
  },
  {
    id: "coverage",
    category: "general",
    label: { zh: "测试覆盖率", en: "Coverage" },
    patterns: ["coverage/", ".nyc_output/", "*.lcov", "junit.xml"],
  },
  {
    id: "database",
    category: "general",
    label: { zh: "本地数据库", en: "Local database" },
    patterns: ["*.sqlite", "*.sqlite3", "*.db", "*.db-journal", "*.sqlite-wal", "dump.rdb"],
  },
  {
    id: "temp",
    category: "general",
    label: { zh: "临时文件", en: "Temp files" },
    patterns: ["*.tmp", "*.bak", "*.orig", "*.rej", ".history/"],
  },
];

/**
 * Shortcut presets: one click replaces the whole selection. Every preset also
 * carries the env/log basics, since almost every project wants them.
 */
export const IGNORE_PRESETS: IgnorePreset[] = [
  {
    id: "node-web",
    label: { zh: "Node.js Web 项目", en: "Node.js web app" },
    groups: ["node", "typescript", "next", "vscode", "macos", "windows", "dotenv", "logs"],
  },
  {
    id: "react",
    label: { zh: "React 项目", en: "React app" },
    groups: ["node", "typescript", "vite", "vscode", "macos", "windows", "dotenv", "logs"],
  },
  {
    id: "python-data",
    label: { zh: "Python 数据科学", en: "Python data science" },
    groups: ["python", "jupyter", "vscode", "macos", "windows", "database", "dotenv", "logs"],
  },
  {
    id: "python-ai",
    label: { zh: "Python AI 项目", en: "Python AI project" },
    groups: ["python", "jupyter", "cache", "vscode", "macos", "windows", "dotenv", "logs"],
  },
  {
    id: "java-backend",
    label: { zh: "Java 后端项目", en: "Java backend" },
    groups: ["java", "maven", "gradle", "jetbrains", "dotenv", "logs"],
  },
  {
    id: "flutter",
    label: { zh: "Flutter 项目", en: "Flutter app" },
    groups: ["dart", "android", "xcode", "vscode", "dotenv", "logs"],
  },
  {
    id: "unity",
    label: { zh: "Unity 游戏项目", en: "Unity game" },
    groups: ["csharp", "unity", "visualstudio", "jetbrains"],
  },
  {
    id: "go-backend",
    label: { zh: "Go 后端项目", en: "Go backend" },
    groups: ["go", "vscode", "macos", "linux", "dotenv", "logs"],
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

export function categoryLabel(category: IgnoreCategory, locale: "zh" | "en"): string {
  return category.label[locale];
}

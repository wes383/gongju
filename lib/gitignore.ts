/**
 * .gitignore composer.
 *
 * The pattern data lives in lib/gitignore-templates.ts, generated from the
 * upstream github/gitignore templates (one file per language / framework /
 * project type, plus `Global/` for editors, operating systems and tools).
 * The catalogue in lib/gitignore-catalog.json maps each upstream template to a
 * category, a bilingual label and optional extra patterns we add on top.
 */
import catalog from "./gitignore-catalog.json";
import { GITIGNORE_TEMPLATES } from "./gitignore-templates";

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

interface CatalogGroup {
  id: string;
  category: IgnoreCategoryId;
  label: { zh: string; en: string };
  template?: string;
  patterns?: string[];
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

export const IGNORE_GROUPS: IgnoreGroup[] = (catalog.groups as unknown as CatalogGroup[]).map(
  (group) => ({
    id: group.id,
    category: group.category,
    label: group.label,
    patterns: GITIGNORE_TEMPLATES[group.id] ?? group.patterns ?? [],
  })
);

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
    groups: ["dart", "flutter", "android", "xcode", "vscode", "dotenv", "logs"],
  },
  {
    id: "unity",
    label: { zh: "Unity 游戏项目", en: "Unity game" },
    groups: ["csharp", "unity", "jetbrains"],
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

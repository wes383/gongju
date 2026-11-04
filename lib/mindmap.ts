/**
 * Mind map outline parsing and a compact left-to-right tree layout.
 *
 * The layout is deliberately simple: leaves are stacked in document order and
 * each parent sits halfway between its first and last child, which keeps
 * siblings in the same order as the outline without a tidy-tree algorithm.
 */

import { textWidth } from "./chart";
import type { ChartTheme } from "./chart";
import { escapeHtml } from "./encoding";
import { codedError } from "./errors";

export interface MindNode {
  label: string;
  children: MindNode[];
}

const MAX_DEPTH = 6;
const MAX_NODES = 240;
const FONT = "system-ui, -apple-system, 'Segoe UI', 'Noto Sans SC', sans-serif";

const LIST_MARKER = /^(?:[-*+]\s+|\d+[.)]\s+)/;

/**
 * Parse an indented outline or Markdown heading list into a tree.
 *
 * The first entry becomes the centre topic; any further entry at the top
 * level is attached to it as a branch, so pasting a flat list still produces
 * a usable map.
 */
export function parseOutline(text: string): MindNode {
  const rows: { label: string; indent: number; level: number | null }[] = [];

  for (const raw of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) continue;

    const heading = /^(#{1,6})\s+(.+)$/.exec(line.trim());
    if (heading) {
      rows.push({ label: heading[2].trim(), indent: 0, level: heading[1].length - 1 });
      continue;
    }

    const withoutMarker = line.replace(/^\s*/, "").replace(LIST_MARKER, "");
    const indentText = line.slice(0, line.length - line.replace(/^\s*/, "").length);
    const indent = indentText.replace(/\t/g, "    ").length;
    rows.push({ label: withoutMarker.trim(), indent, level: null });
  }

  if (rows.length === 0) throw codedError("mindmap.empty");

  // Headings carry an explicit level; plain indentation is normalised so that
  // two-space and four-space styles both map to the same depth.
  const levels = new Map<number, number>();
  const indentLevels = [...new Set(rows.map((row) => row.indent))].sort((a, b) => a - b);
  indentLevels.forEach((indent, index) => levels.set(indent, index));

  const stack: { depth: number; node: MindNode }[] = [];
  let root: MindNode | null = null;
  let count = 0;

  for (const row of rows) {
    const depth = row.level ?? levels.get(row.indent) ?? 0;
    if (depth > MAX_DEPTH) throw codedError("mindmap.tooDeep", MAX_DEPTH);
    count += 1;
    if (count > MAX_NODES) throw codedError("mindmap.tooMany", MAX_NODES);

    const node: MindNode = { label: row.label || "—", children: [] };

    if (!root) {
      root = node;
      stack.length = 0;
      stack.push({ depth: 0, node: root });
      continue;
    }

    // Extra top-level entries become branches of the centre topic
    const effectiveDepth = depth === 0 ? 1 : depth;
    while (stack.length > 0 && stack[stack.length - 1].depth >= effectiveDepth) stack.pop();
    const parent = stack.length > 0 ? stack[stack.length - 1].node : root;
    parent.children.push(node);
    stack.push({ depth: effectiveDepth, node });
  }

  return root as MindNode;
}

export interface MindLayoutOptions {
  rowHeight?: number;
  columnGap?: number;
  padding?: number;
}

export interface MindLayoutNode {
  label: string;
  depth: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  isRoot: boolean;
}

export interface MindLayoutEdge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}

export interface MindLayout {
  nodes: MindLayoutNode[];
  edges: MindLayoutEdge[];
  width: number;
  height: number;
}

const NODE_HEIGHT = 32;
const NODE_FONT = 13;
const NODE_PADDING = 24;
const MIN_NODE_WIDTH = 72;
const MAX_NODE_WIDTH = 220;

export const MIND_COLORS = [
  "#6366f1",
  "#22d3ee",
  "#f59e0b",
  "#ef4444",
  "#10b981",
  "#a855f7",
  "#f97316",
  "#0ea5e9",
];

function displayLabel(label: string): string {
  const text = label.trim();
  return text.length > 26 ? `${text.slice(0, 25)}…` : text;
}

function branchColor(index: number): string {
  return MIND_COLORS[index % MIND_COLORS.length];
}

interface FlatNode {
  depth: number;
  parent: number;
  branch: number;
  label: string;
  width: number;
  children: number[];
}

export function layoutMindmap(root: MindNode, options: MindLayoutOptions = {}): MindLayout {
  const rowHeight = options.rowHeight ?? 44;
  const columnGap = options.columnGap ?? 56;
  const padding = options.padding ?? 28;

  // Pass 1: flatten the tree and remember the widest node per column
  const flat: FlatNode[] = [];
  const widths: number[] = [];

  const flatten = (node: MindNode, depth: number, parent: number, branch: number): number => {
    const label = displayLabel(node.label);
    const width = Math.max(
      MIN_NODE_WIDTH,
      Math.min(MAX_NODE_WIDTH, textWidth(label, NODE_FONT) + NODE_PADDING * 2)
    );
    const index = flat.length;
    flat.push({ depth, parent, branch, label, width, children: [] });
    widths[depth] = Math.max(widths[depth] ?? 0, width);
    flat[index].children = node.children.map((child, childIndex) =>
      flatten(child, depth + 1, index, depth === 0 ? childIndex + 1 : branch)
    );
    return index;
  };
  flatten(root, 0, -1, 0);

  const columnX: number[] = [];
  let x = padding;
  for (let depth = 0; depth < widths.length; depth += 1) {
    columnX[depth] = x;
    x += widths[depth] + columnGap;
  }

  // Pass 2: leaves fill rows top down, parents sit midway between first and last child
  const centers: number[] = [];
  let leafRow = 0;
  const assignCenter = (index: number): number => {
    const item = flat[index];
    if (item.children.length === 0) {
      centers[index] = padding + NODE_HEIGHT / 2 + rowHeight * leafRow;
      leafRow += 1;
    } else {
      const childCenters = item.children.map(assignCenter);
      centers[index] = (childCenters[0] + childCenters[childCenters.length - 1]) / 2;
    }
    return centers[index];
  };
  assignCenter(0);

  const nodes: MindLayoutNode[] = flat.map((item, index) => ({
    label: item.label,
    depth: item.depth,
    x: columnX[item.depth],
    y: centers[index],
    width: item.width,
    height: NODE_HEIGHT,
    color: item.depth === 0 ? MIND_COLORS[0] : branchColor(item.branch),
    isRoot: item.depth === 0,
  }));

  const edges: MindLayoutEdge[] = [];
  flat.forEach((item, index) => {
    if (item.parent < 0) return;
    const parent = nodes[item.parent];
    edges.push({
      x1: parent.x + parent.width,
      y1: parent.y,
      x2: columnX[item.depth],
      y2: centers[index],
      color: item.depth === 1 ? MIND_COLORS[0] : branchColor(item.branch),
    });
  });

  return {
    nodes,
    edges,
    width: Math.max(x - columnGap + padding, padding * 2 + MIN_NODE_WIDTH),
    height: padding * 2 + NODE_HEIGHT + rowHeight * Math.max(0, leafRow - 1),
  };
}

export function renderMindmapSvg(root: MindNode, options: { theme: ChartTheme } & MindLayoutOptions): string {
  const layout = layoutMindmap(root, options);
  const { theme } = options;
  const width = Math.ceil(layout.width);
  const height = Math.ceil(layout.height);

  const edges = layout.edges
    .map((edge) => {
      const mid = (edge.x1 + edge.x2) / 2;
      return `<path d="M ${edge.x1} ${edge.y1} C ${mid} ${edge.y1} ${mid} ${edge.y2} ${edge.x2} ${edge.y2}" fill="none" stroke="${edge.color}" stroke-width="2" stroke-opacity="0.55"/>`;
    })
    .join("");

  const nodes = layout.nodes
    .map((node) => {
      const x = node.x;
      const y = node.y - node.height / 2;
      const fill = node.isRoot ? node.color : theme.background;
      const stroke = node.isRoot ? node.color : node.color;
      const textColor = node.isRoot ? "#ffffff" : theme.text;
      const weight = node.isRoot ? 600 : 500;
      return (
        `<rect x="${x}" y="${y}" width="${Math.round(node.width)}" height="${node.height}" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="${node.isRoot ? 0 : 1.5}"/>` +
        `<text x="${x + node.width / 2}" y="${y + node.height / 2 + 4.5}" font-size="${NODE_FONT}" font-weight="${weight}" text-anchor="middle" fill="${textColor}">${escapeHtml(
          node.label
        )}</text>`
      );
    })
    .join("");

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${FONT}" role="img">` +
    `<rect x="0" y="0" width="${width}" height="${height}" fill="${theme.background}"/>` +
    edges +
    nodes +
    `</svg>`
  );
}

export const MINDMAP_SAMPLES = {
  zh: {
    indent: `产品规划
  用户研究
    访谈
    问卷
  功能设计
    核心流程
    边缘场景
  上线节奏
    内测
    公测
    正式版`,
    heading: `# 季度目标
## 增长
### 拉新
### 留存
## 体验
### 性能
### 可访问性
## 团队
### 招聘
### 培训`,
  },
  en: {
    indent: `Product plan
  User research
    Interviews
    Surveys
  Feature design
    Core flows
    Edge cases
  Release plan
    Internal test
    Public beta
    General release`,
    heading: `# Quarterly goals
## Growth
### Acquisition
### Retention
## Experience
### Performance
### Accessibility
## Team
### Hiring
### Training`,
  },
} as const;

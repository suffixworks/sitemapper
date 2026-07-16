// Pure projection: SitemapDoc -> React Flow nodes/edges via d3-hierarchy.
// Node positions are DERIVED here on every structural change; never user-set.
// Cards are variable-height (notes wrap fully): d3 gives the horizontal (breadth)
// position; vertical rows are stacked by the tallest card in each depth so cards
// never overlap. Actual measured heights (when passed in) make it exact.

import { hierarchy, tree } from "d3-hierarchy";
import { MarkerType, type Edge, type Node } from "@xyflow/react";
import { type SitemapDoc, type SitemapNode, descendantCount } from "./tree";

export const REF_COLOR = "#8460C0";

export const NODE_W = 208;
export const NODE_H = 74; // base card height (kind + title + slug + padding)
export const H_GAP = 26;
export const V_GAP = 60; // vertical gap between rows

// Rough height of a card given its notes (fallback until React Flow measures it).
export function estimateNodeHeight(node: SitemapNode): number {
  if (!node.notes) return NODE_H;
  const lines = node.notes
    .split("\n")
    .reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / 29)), 0);
  return NODE_H + 8 + lines * 18;
}

export interface SitemapNodeData extends Record<string, unknown> {
  node: SitemapNode;
  depth: number;
  descendants: number;
  hasChildren: boolean;
  collapsed: boolean;
}

export type SitemapRFNode = Node<SitemapNodeData, "sitemap">;

interface HierNode {
  id: string;
  node: SitemapNode;
  children: HierNode[];
}

function buildHierarchy(doc: SitemapDoc, id: string): HierNode {
  const node = doc.nodes[id];
  const children = node.collapsed
    ? []
    : node.children.filter((cid) => doc.nodes[cid]).map((cid) => buildHierarchy(doc, cid));
  return { id, node, children };
}

export interface LayoutResult {
  rfNodes: SitemapRFNode[];
  rfEdges: Edge[];
}

export function layout(
  doc: SitemapDoc,
  heightById?: Record<string, number>,
): LayoutResult {
  if (!doc.rootId || !doc.nodes[doc.rootId]) {
    return { rfNodes: [], rfEdges: [] };
  }

  const root = hierarchy<HierNode>(buildHierarchy(doc, doc.rootId), (d) => d.children);
  // d3 supplies the breadth (x); we compute y ourselves from row heights.
  const laid = tree<HierNode>()
    .nodeSize([NODE_W + H_GAP, 1])
    .separation(() => 1)(root);

  const heightOf = (n: SitemapNode): number =>
    Math.round(heightById?.[n.id] ?? estimateNodeHeight(n));

  // Tallest card per depth → stack rows so nothing overlaps.
  const maxByDepth = new Map<number, number>();
  let maxDepth = 0;
  laid.each((d) => {
    maxDepth = Math.max(maxDepth, d.depth);
    maxByDepth.set(d.depth, Math.max(maxByDepth.get(d.depth) ?? 0, heightOf(d.data.node)));
  });
  const rowTop: number[] = [0];
  for (let i = 1; i <= maxDepth; i++) {
    rowTop[i] = rowTop[i - 1] + (maxByDepth.get(i - 1) ?? NODE_H) + V_GAP;
  }

  const rfNodes: SitemapRFNode[] = [];
  const rfEdges: Edge[] = [];
  const visible = new Set<string>();
  const withRefs: SitemapNode[] = [];

  laid.each((d) => {
    const sn = d.data.node;
    visible.add(sn.id);
    if (sn.refs?.length) withRefs.push(sn);
    const h = heightOf(sn);
    rfNodes.push({
      id: sn.id,
      type: "sitemap",
      position: { x: d.x, y: rowTop[d.depth] },
      draggable: false,
      // Hand RF the dimensions so nodes are never rendered visibility:hidden
      // (which would break a freshly-added node's inline-edit focus).
      width: NODE_W,
      height: h,
      measured: { width: NODE_W, height: h },
      data: {
        node: sn,
        depth: d.depth,
        descendants: descendantCount(doc, sn.id),
        hasChildren: sn.children.length > 0,
        collapsed: !!sn.collapsed,
      },
    });
    if (d.parent) {
      rfEdges.push({
        id: `${d.parent.data.id}->${sn.id}`,
        source: d.parent.data.id,
        sourceHandle: "s",
        target: sn.id,
        targetHandle: "t",
        type: "smoothstep",
        pathOptions: { borderRadius: 12 },
      } as Edge);
    }
  });

  // Cross-links (dashed) from back-office cards up to referenced nodes.
  for (const sn of withRefs) {
    for (const targetId of sn.refs ?? []) {
      if (!visible.has(targetId) || targetId === sn.id) continue;
      rfEdges.push({
        id: `ref-${sn.id}->${targetId}`,
        source: sn.id,
        sourceHandle: "rs",
        target: targetId,
        targetHandle: "rt",
        type: "smoothstep",
        pathOptions: { borderRadius: 12 },
        style: { stroke: REF_COLOR, strokeWidth: 1.8, strokeDasharray: "5 4" },
        markerEnd: { type: MarkerType.ArrowClosed, color: REF_COLOR, width: 16, height: 16 },
        zIndex: 2,
      } as Edge);
    }
  }

  return { rfNodes, rfEdges };
}

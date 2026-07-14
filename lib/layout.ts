// Pure projection: SitemapDoc -> React Flow nodes/edges via d3-hierarchy.
// Node positions are DERIVED here on every structural change; never user-set.

import { hierarchy, tree } from "d3-hierarchy";
import type { Edge, Node } from "@xyflow/react";
import { type SitemapDoc, type SitemapNode, descendantCount } from "./tree";

export const NODE_W = 208;
export const NODE_H = 74;
export const H_GAP = 26;
export const V_GAP = 78;

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

export function layout(doc: SitemapDoc): LayoutResult {
  if (!doc.rootId || !doc.nodes[doc.rootId]) {
    return { rfNodes: [], rfEdges: [] };
  }

  const root = hierarchy<HierNode>(buildHierarchy(doc, doc.rootId), (d) => d.children);
  // Uniform horizontal spacing (like the prototype): siblings and cousins share the same gap.
  const laid = tree<HierNode>()
    .nodeSize([NODE_W + H_GAP, NODE_H + V_GAP])
    .separation(() => 1)(root);

  const rfNodes: SitemapRFNode[] = [];
  const rfEdges: Edge[] = [];

  laid.each((d) => {
    const sn = d.data.node;
    rfNodes.push({
      id: sn.id,
      type: "sitemap",
      position: { x: d.x, y: d.y },
      draggable: false,
      // Fixed-size cards: hand React Flow the dimensions so it treats nodes as
      // already measured and never renders them visibility:hidden (which would
      // make a freshly-added node's inline-edit input impossible to focus).
      width: NODE_W,
      height: NODE_H,
      measured: { width: NODE_W, height: NODE_H },
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
        target: sn.id,
        type: "smoothstep",
        pathOptions: { borderRadius: 12 },
      } as Edge);
    }
  });

  return { rfNodes, rfEdges };
}

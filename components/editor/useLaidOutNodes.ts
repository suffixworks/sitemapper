"use client";

import { useEffect, useMemo, useState } from "react";
import { useNodesState } from "@xyflow/react";
import { layout, type SitemapRFNode } from "@/lib/layout";
import type { SitemapDoc } from "@/lib/tree";

// Projects a doc into React Flow nodes/edges, then feeds each card's *measured*
// height back into the layout so rows stack exactly (variable-height cards never
// overlap, and exports capture the full card). Shared by the staff editor and
// the guest read-only canvas.
export function useLaidOutNodes(doc: SitemapDoc) {
  const [heights, setHeights] = useState<Record<string, number>>({});
  const base = useMemo(() => layout(doc, heights), [doc, heights]);
  const [nodes, setNodes, onNodesChange] = useNodesState<SitemapRFNode>([]);

  // Reconcile base -> nodes in place (preserve identity + RF's measured dims).
  useEffect(() => {
    setNodes((prev) => {
      const byId = new Map(prev.map((n) => [n.id, n]));
      return base.rfNodes.map((n) => {
        const old = byId.get(n.id);
        return old
          ? { ...old, position: n.position, width: n.width, height: n.height, data: n.data }
          : n;
      });
    });
  }, [base, setNodes]);

  // Capture measured heights (converges: once heights match, no more updates).
  useEffect(() => {
    let changed = false;
    const next = { ...heights };
    for (const n of nodes) {
      const h = n.measured?.height;
      if (h && Math.abs((heights[n.id] ?? 0) - h) > 1) {
        next[n.id] = h;
        changed = true;
      }
    }
    if (changed) setHeights(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes]);

  return { nodes, setNodes, onNodesChange, edges: base.rfEdges };
}

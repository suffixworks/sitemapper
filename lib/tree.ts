// Pure tree operations — no React. Unit-tested (lib/tree.test.ts) in Phase 1.
// The tree is the single source of truth: { rootId, nodes: Record<id, node> }.

export type NodeKind = "page" | "section" | "external"; // kind/notes/meta are v2

export interface SitemapNode {
  id: string;
  title: string;
  slug: string;
  parentId: string | null;
  children: string[];
  color?: string | null;
  collapsed?: boolean;
}

export interface SitemapDoc {
  rootId: string | null;
  nodes: Record<string, SitemapNode>;
}

// TODO(Phase 1): addChild, addSibling, removeSubtree, rename, setSlug, reorder, move.

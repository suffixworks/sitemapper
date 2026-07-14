// Shared comment types + helpers (no React). A comment targets a node
// (node_id) or the whole sitemap (node_id null); replies chain via parent_id.

export interface CommentRow {
  id: string;
  nodeId: string | null;
  parentId: string | null;
  body: string;
  authorName: string;
  authorEmail: string | null;
  isStaff: boolean;
  resolved: boolean;
  createdAt: string; // ISO
}

export interface CommentInput {
  nodeId: string | null;
  parentId: string | null;
  body: string;
  authorName?: string; // guest-supplied
  authorEmail?: string; // guest-supplied
}

export const MAX_COMMENT_LEN = 4000;

export function isValidBody(body: string): boolean {
  const n = body.trim().length;
  return n >= 1 && n <= MAX_COMMENT_LEN;
}

export interface CommentThread {
  root: CommentRow;
  replies: CommentRow[];
}

/** Group flat rows into root threads (oldest first), each with its replies. */
export function buildThreads(rows: CommentRow[]): CommentThread[] {
  const byParent = new Map<string, CommentRow[]>();
  const roots: CommentRow[] = [];
  for (const r of rows) {
    if (r.parentId) {
      const arr = byParent.get(r.parentId) ?? [];
      arr.push(r);
      byParent.set(r.parentId, arr);
    } else {
      roots.push(r);
    }
  }
  const asc = (a: CommentRow, b: CommentRow) => a.createdAt.localeCompare(b.createdAt);
  roots.sort(asc);
  return roots.map((root) => ({
    root,
    replies: (byParent.get(root.id) ?? []).sort(asc),
  }));
}

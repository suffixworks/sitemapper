// Pure tree operations — no React. Unit-tested in lib/tree.test.ts.
// The tree is the single source of truth: { rootId, nodes: Record<id, node> }.
// Every function is immutable: it returns a new doc and never mutates the input.

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

export function emptyDoc(): SitemapDoc {
  return { rootId: null, nodes: {} };
}

export function slugify(s: string): string {
  return (
    (s || "")
      .toLowerCase()
      .trim()
      // keep word chars and Thai; collapse everything else to a dash
      .replace(/[^\w฀-๿]+/g, "-")
      .replace(/^-+|-+$/g, "") || "page"
  );
}

export function getNode(doc: SitemapDoc, id: string): SitemapNode | undefined {
  return doc.nodes[id];
}

export function depthOf(doc: SitemapDoc, id: string): number {
  let d = 0;
  let n = doc.nodes[id];
  while (n && n.parentId) {
    d++;
    n = doc.nodes[n.parentId];
  }
  return d;
}

/** Number of descendants below `id` (not counting itself). */
export function descendantCount(doc: SitemapDoc, id: string): number {
  const n = doc.nodes[id];
  if (!n) return 0;
  let c = 0;
  for (const cid of n.children) c += 1 + descendantCount(doc, cid);
  return c;
}

function newNode(
  id: string,
  title: string,
  slug: string,
  parentId: string | null,
): SitemapNode {
  return { id, title, slug, parentId, children: [], color: null, collapsed: false };
}

/** Create a fresh doc with a single root node. */
export function createRoot(id: string, title = "Home", slug = "/"): SitemapDoc {
  return { rootId: id, nodes: { [id]: newNode(id, title, slug, null) } };
}

/** Append a new child under `parentId`. Expands the parent if collapsed. */
export function addChild(
  doc: SitemapDoc,
  parentId: string,
  id: string,
  title = "New Page",
  slug?: string,
): SitemapDoc {
  const parent = doc.nodes[parentId];
  if (!parent) return doc;
  const child = newNode(id, title, slug ?? "/" + slugify(title), parentId);
  return {
    ...doc,
    nodes: {
      ...doc.nodes,
      [id]: child,
      [parentId]: {
        ...parent,
        children: [...parent.children, id],
        collapsed: false,
      },
    },
  };
}

/** Insert a new sibling immediately after `siblingId`. Root falls back to addChild. */
export function addSibling(
  doc: SitemapDoc,
  siblingId: string,
  id: string,
  title = "New Page",
  slug?: string,
): SitemapDoc {
  const sibling = doc.nodes[siblingId];
  if (!sibling) return doc;
  if (!sibling.parentId) return addChild(doc, siblingId, id, title, slug);
  const parent = doc.nodes[sibling.parentId];
  const idx = parent.children.indexOf(siblingId);
  const children = [...parent.children];
  children.splice(idx + 1, 0, id);
  return {
    ...doc,
    nodes: {
      ...doc.nodes,
      [id]: newNode(id, title, slug ?? "/" + slugify(title), parent.id),
      [parent.id]: { ...parent, children },
    },
  };
}

/** Remove a node and its whole subtree. Removing the root empties the doc. */
export function removeSubtree(doc: SitemapDoc, id: string): SitemapDoc {
  const node = doc.nodes[id];
  if (!node) return doc;
  if (!node.parentId) return emptyDoc();

  const nodes = { ...doc.nodes };
  const collect = (nid: string) => {
    for (const cid of nodes[nid]?.children ?? []) collect(cid);
    delete nodes[nid];
  };
  collect(id);

  const parent = nodes[node.parentId];
  nodes[node.parentId] = {
    ...parent,
    children: parent.children.filter((c) => c !== id),
  };
  return { ...doc, nodes };
}

export function rename(doc: SitemapDoc, id: string, title: string): SitemapDoc {
  const node = doc.nodes[id];
  if (!node) return doc;
  return {
    ...doc,
    nodes: { ...doc.nodes, [id]: { ...node, title: title.trim() || "Untitled" } },
  };
}

/** Set a node's slug. Empty input regenerates from the title; ensures a leading "/". */
export function setSlug(doc: SitemapDoc, id: string, slug: string): SitemapDoc {
  const node = doc.nodes[id];
  if (!node) return doc;
  const v = slug.trim();
  const next = v ? (v[0] === "/" ? v : "/" + v) : "/" + slugify(node.title);
  return { ...doc, nodes: { ...doc.nodes, [id]: { ...node, slug: next } } };
}

/** Move a node among its siblings. dir = -1 (left) or +1 (right). No-op at the ends. */
export function reorder(doc: SitemapDoc, id: string, dir: -1 | 1): SitemapDoc {
  const node = doc.nodes[id];
  if (!node || !node.parentId) return doc;
  const parent = doc.nodes[node.parentId];
  const i = parent.children.indexOf(id);
  const j = i + dir;
  if (j < 0 || j >= parent.children.length) return doc;
  const children = [...parent.children];
  [children[i], children[j]] = [children[j], children[i]];
  return {
    ...doc,
    nodes: { ...doc.nodes, [parent.id]: { ...parent, children } },
  };
}

/** Toggle an explicit per-node color; setting the same color again clears it. */
export function setColor(doc: SitemapDoc, id: string, color: string): SitemapDoc {
  const node = doc.nodes[id];
  if (!node) return doc;
  return {
    ...doc,
    nodes: {
      ...doc.nodes,
      [id]: { ...node, color: node.color === color ? null : color },
    },
  };
}

export function toggleCollapse(doc: SitemapDoc, id: string): SitemapDoc {
  const node = doc.nodes[id];
  if (!node) return doc;
  return {
    ...doc,
    nodes: { ...doc.nodes, [id]: { ...node, collapsed: !node.collapsed } },
  };
}

/** Serialize a Markdown outline: `- Title \`/slug\`` indented by depth. */
export function toOutline(doc: SitemapDoc): string {
  if (!doc.rootId || !doc.nodes[doc.rootId]) return "# Sitemap\n";
  let out = "# Sitemap\n\n";
  const walk = (id: string, d: number) => {
    const n = doc.nodes[id];
    if (!n) return;
    out += "  ".repeat(d) + "- " + n.title + " `" + n.slug + "`\n";
    for (const c of n.children) walk(c, d + 1);
  };
  walk(doc.rootId, 0);
  return out;
}

/** The demo sitemap from the prototype. `makeId` supplies fresh ids. */
export function seedDemo(makeId: () => string): SitemapDoc {
  const rootId = makeId();
  let doc = createRoot(rootId, "Home", "/");

  const add = (parentId: string, title: string, slug: string): string => {
    const id = makeId();
    doc = addChild(doc, parentId, id, title, slug);
    return id;
  };

  add(rootId, "About", "/about");
  const services = add(rootId, "Services", "/services");
  const work = add(rootId, "Work", "/work");
  const blog = add(rootId, "Blog", "/blog");
  add(rootId, "Contact", "/contact");

  add(services, "Strategy", "/services/strategy");
  add(services, "Development", "/services/development");
  add(services, "Content", "/services/content");

  add(work, "Case Studies", "/work/case-studies");
  add(work, "Clients", "/work/clients");

  add(blog, "Articles", "/blog/articles");

  return doc;
}

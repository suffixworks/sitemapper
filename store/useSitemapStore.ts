// Zustand store: the tree is the single source of truth.
// RF nodes/edges are projected from `doc` each render (lib/layout.ts).
// Undo/redo (zundo) is layered on in Phase 2.

import { create } from "zustand";
import * as tree from "@/lib/tree";
import type { SitemapDoc } from "@/lib/tree";

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "n" + Math.random().toString(36).slice(2, 10);
}

export type EditField = "title" | "slug";
export interface Editing {
  id: string;
  field: EditField;
}

interface SitemapState {
  doc: SitemapDoc;
  selectedId: string | null;
  editing: Editing | null;

  // structural mutations
  addChild: (parentId: string) => void;
  addSibling: (id: string) => void;
  remove: (id: string) => void;
  rename: (id: string, title: string) => void;
  setSlug: (id: string, slug: string) => void;
  reorder: (id: string, dir: -1 | 1) => void;
  setColor: (id: string, color: string) => void;
  toggleCollapse: (id: string) => void;
  createRoot: () => void;
  reset: () => void;

  // selection & inline editing
  select: (id: string | null) => void;
  startEditing: (id: string, field: EditField) => void;
  stopEditing: () => void;
}

export const useSitemapStore = create<SitemapState>((set) => ({
  doc: tree.seedDemo(newId),
  selectedId: null,
  editing: null,

  addChild: (parentId) =>
    set((s) => {
      const id = newId();
      return { doc: tree.addChild(s.doc, parentId, id), selectedId: id, editing: { id, field: "title" } };
    }),

  addSibling: (targetId) =>
    set((s) => {
      const id = newId();
      return { doc: tree.addSibling(s.doc, targetId, id), selectedId: id, editing: { id, field: "title" } };
    }),

  remove: (id) =>
    set((s) => ({
      doc: tree.removeSubtree(s.doc, id),
      selectedId: s.selectedId === id ? null : s.selectedId,
      editing: s.editing?.id === id ? null : s.editing,
    })),

  rename: (id, title) => set((s) => ({ doc: tree.rename(s.doc, id, title), editing: null })),

  setSlug: (id, slug) => set((s) => ({ doc: tree.setSlug(s.doc, id, slug), editing: null })),

  reorder: (id, dir) => set((s) => ({ doc: tree.reorder(s.doc, id, dir) })),

  setColor: (id, color) => set((s) => ({ doc: tree.setColor(s.doc, id, color) })),

  toggleCollapse: (id) => set((s) => ({ doc: tree.toggleCollapse(s.doc, id) })),

  createRoot: () =>
    set(() => {
      const id = newId();
      return { doc: tree.createRoot(id), selectedId: id, editing: { id, field: "title" } };
    }),

  reset: () => set({ doc: tree.emptyDoc(), selectedId: null, editing: null }),

  select: (id) => set({ selectedId: id }),
  startEditing: (id, field) => set({ selectedId: id, editing: { id, field } }),
  stopEditing: () => set({ editing: null }),
}));

"use client";

import { useEffect, useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  useReactFlow,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toast } from "sonner";
import { Maximize, Network, Plus } from "lucide-react";
import { EDGE_COLOR, EDGE_COLOR_HOT } from "@/lib/colors";
import { useSitemapStore } from "@/store/useSitemapStore";
import { SitemapNodeCard } from "./SitemapNode";
import { useLaidOutNodes } from "./useLaidOutNodes";

const nodeTypes = { sitemap: SitemapNodeCard };

export function SitemapEditor() {
  const doc = useSitemapStore((s) => s.doc);
  const selectedId = useSitemapStore((s) => s.selectedId);
  const select = useSitemapStore((s) => s.select);
  const startEditing = useSitemapStore((s) => s.startEditing);
  const stopEditing = useSitemapStore((s) => s.stopEditing);
  const createRoot = useSitemapStore((s) => s.createRoot);
  const addChild = useSitemapStore((s) => s.addChild);
  const addSibling = useSitemapStore((s) => s.addSibling);
  const remove = useSitemapStore((s) => s.remove);
  const { fitView } = useReactFlow();

  const { nodes, onNodesChange, edges: baseEdges } = useLaidOutNodes(doc);

  // Edge highlight follows the selection (cheap; no relayout).
  const edges = useMemo(
    () =>
      baseEdges.map((e) => {
        const hot = e.source === selectedId || e.target === selectedId;
        return {
          ...e,
          style: { stroke: hot ? EDGE_COLOR_HOT : EDGE_COLOR, strokeWidth: 2 },
          zIndex: hot ? 1 : 0,
        };
      }),
    [baseEdges, selectedId],
  );

  const onNodeClick: NodeMouseHandler = (_, node) => select(node.id);
  const onNodeDoubleClick: NodeMouseHandler = (_, node) => startEditing(node.id, "title");

  // Keyboard shortcuts (ignored while typing in an input).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) {
        return;
      }
      const meta = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();

      if (meta && k === "z") {
        e.preventDefault();
        const temporal = useSitemapStore.temporal.getState();
        if (e.shiftKey) temporal.redo();
        else temporal.undo();
        return;
      }
      if (meta && k === "y") {
        e.preventDefault();
        useSitemapStore.temporal.getState().redo();
        return;
      }
      if (k === "f" && !meta) {
        fitView({ padding: 0.2, maxZoom: 1.4, duration: 300 });
        return;
      }

      const sel = useSitemapStore.getState().selectedId;
      if (!sel) return;
      if (e.key === "Tab") {
        e.preventDefault();
        addChild(sel);
      } else if (e.key === "Enter") {
        e.preventDefault();
        addSibling(sel);
      } else if (e.key === "F2") {
        e.preventDefault();
        startEditing(sel, "title");
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        remove(sel);
        toast("Page deleted");
      } else if (e.key === "Escape") {
        select(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fitView, addChild, addSibling, remove, startEditing, select]);

  const hasRoot = !!doc.rootId;

  return (
    <div className="relative flex-1" style={{ background: "#EDF0F5" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        nodesFocusable={false}
        edgesFocusable={false}
        zoomOnDoubleClick={false}
        deleteKeyCode={null}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onPaneClick={() => {
          select(null);
          stopEditing();
        }}
        minZoom={0.25}
        maxZoom={2.5}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1.4 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={26} size={1.3} color="#D2D8E3" />
        <Controls showInteractive={false} />
      </ReactFlow>

      {!hasRoot && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="pointer-events-auto max-w-[360px] rounded-2xl border border-[#E1E6EF] bg-white px-10 py-9 text-center shadow-[0_8px_30px_rgba(20,30,60,.16)]">
            <div className="mx-auto mb-3.5 grid h-[52px] w-[52px] place-items-center rounded-[13px] bg-[#EBEAFC]">
              <Network className="h-[26px] w-[26px] text-[#4C46E5]" />
            </div>
            <h2 className="text-[19px] font-bold tracking-tight text-[#1B2130]">
              Start a sitemap
            </h2>
            <p className="mx-0 my-2 text-[13.5px] leading-relaxed text-[#7A8496]">
              Create your home page, then branch out with child and sibling pages.
            </p>
            <button
              onClick={() => createRoot()}
              className="mt-2 inline-flex items-center gap-2 rounded-[9px] bg-[#4C46E5] px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-[#5b55f0]"
            >
              <Plus className="h-[18px] w-[18px]" strokeWidth={2.2} /> Add Home page
            </button>
          </div>
        </div>
      )}

      {hasRoot && (
        <button
          onClick={() => fitView({ padding: 0.2, maxZoom: 1.4, duration: 300 })}
          title="Fit to screen (F)"
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-lg border border-[#E1E6EF] bg-white/90 text-[#7A8496] shadow-sm backdrop-blur transition-colors hover:text-[#4C46E5]"
        >
          <Maximize className="h-[18px] w-[18px]" />
        </button>
      )}

      {hasRoot && (
        <div className="pointer-events-none absolute bottom-3.5 left-16 z-10 hidden max-w-md rounded-[10px] border border-[#E1E6EF] bg-white/90 px-3 py-2 text-[11.5px] leading-relaxed text-[#7A8496] shadow-sm backdrop-blur md:block">
          <b className="font-semibold text-[#1B2130]">Shortcuts</b> · select a card, then{" "}
          <Kbd>Tab</Kbd> child · <Kbd>Enter</Kbd> sibling · <Kbd>F2</Kbd> rename ·{" "}
          <Kbd>Del</Kbd> delete · <Kbd>F</Kbd> fit · <Kbd>Ctrl</Kbd>+<Kbd>Z</Kbd> undo
        </div>
      )}
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-[#DDE1EB] border-b-2 bg-[#EEF0F6] px-1 font-mono text-[10.5px] text-[#1B2130]">
      {children}
    </kbd>
  );
}

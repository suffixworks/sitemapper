"use client";

import { useEffect, useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Maximize, Network, Plus } from "lucide-react";
import { EDGE_COLOR, EDGE_COLOR_HOT } from "@/lib/colors";
import { layout, type SitemapRFNode } from "@/lib/layout";
import { useSitemapStore } from "@/store/useSitemapStore";
import { SitemapNodeCard } from "./SitemapNode";

const nodeTypes = { sitemap: SitemapNodeCard };

function EditorInner() {
  const doc = useSitemapStore((s) => s.doc);
  const selectedId = useSitemapStore((s) => s.selectedId);
  const select = useSitemapStore((s) => s.select);
  const startEditing = useSitemapStore((s) => s.startEditing);
  const stopEditing = useSitemapStore((s) => s.stopEditing);
  const createRoot = useSitemapStore((s) => s.createRoot);
  const { fitView } = useReactFlow();

  const base = useMemo(() => layout(doc), [doc]);

  const [nodes, setNodes, onNodesChange] = useNodesState<SitemapRFNode>([]);

  // Re-project on every tree change, but reconcile in place: keep existing node
  // objects (and their measured sizes) so unchanged cards don't churn or remount.
  // Wholesale replacement re-measures every node and disrupts a freshly-added
  // node's inline-edit input.
  useEffect(() => {
    setNodes((prev) => {
      const byId = new Map(prev.map((n) => [n.id, n]));
      return base.rfNodes.map((n) => {
        const old = byId.get(n.id);
        return old ? { ...old, position: n.position, data: n.data } : n;
      });
    });
  }, [base, setNodes]);

  // Edge highlight follows the selection (cheap; no relayout).
  const edges = useMemo(
    () =>
      base.rfEdges.map((e) => {
        const hot = e.source === selectedId || e.target === selectedId;
        return {
          ...e,
          style: { stroke: hot ? EDGE_COLOR_HOT : EDGE_COLOR, strokeWidth: 2 },
          zIndex: hot ? 1 : 0,
        };
      }),
    [base.rfEdges, selectedId],
  );

  const onNodeClick: NodeMouseHandler = (_, node) => select(node.id);
  const onNodeDoubleClick: NodeMouseHandler = (_, node) => startEditing(node.id, "title");

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
    </div>
  );
}

export function SitemapEditor() {
  return (
    <ReactFlowProvider>
      <EditorInner />
    </ReactFlowProvider>
  );
}

"use client";

import { useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { EDGE_COLOR } from "@/lib/colors";
import { layout } from "@/lib/layout";
import type { SitemapDoc } from "@/lib/tree";
import { ReadOnlyNodeCard } from "./ReadOnlyNode";

const nodeTypes = { sitemap: ReadOnlyNodeCard };

function Inner({ doc }: { doc: SitemapDoc }) {
  const { rfNodes, rfEdges } = useMemo(() => layout(doc), [doc]);
  const edges = useMemo(
    () => rfEdges.map((e) => ({ ...e, style: { stroke: EDGE_COLOR, strokeWidth: 2 } })),
    [rfEdges],
  );

  return (
    <div className="relative flex-1" style={{ background: "#EDF0F5" }}>
      <ReactFlow
        nodes={rfNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        nodesFocusable={false}
        elementsSelectable={false}
        zoomOnDoubleClick={false}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1.4 }}
        minZoom={0.25}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={26} size={1.3} color="#D2D8E3" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

export function ReadOnlyCanvas({ doc }: { doc: SitemapDoc }) {
  return (
    <ReactFlowProvider>
      <Inner doc={doc} />
    </ReactFlowProvider>
  );
}

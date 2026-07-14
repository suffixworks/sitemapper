"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { colorForNode } from "@/lib/colors";
import { NODE_W } from "@/lib/layout";
import type { SitemapRFNode } from "@/lib/layout";

// Static, non-interactive card for the guest read-only view.
export function ReadOnlyNodeCard({ data }: NodeProps<SitemapRFNode>) {
  const { node, depth } = data;
  const accent = colorForNode(node.color, depth);
  const isRoot = node.parentId === null;

  return (
    <div
      className="relative select-none rounded-[11px] border border-[#E1E6EF] bg-white px-3 pb-3 pt-[11px] shadow-[0_1px_2px_rgba(20,30,60,.06),0_6px_18px_rgba(20,30,60,.08)]"
      style={{ width: NODE_W }}
    >
      <span
        className="pointer-events-none absolute inset-x-[14px] top-0 h-[3px] rounded-b-[3px]"
        style={{ background: accent }}
      />
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={false}
        className="!h-1 !w-1 !border-0 !bg-transparent !opacity-0"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={false}
        className="!h-1 !w-1 !border-0 !bg-transparent !opacity-0"
      />
      <div
        className="text-[9.5px] font-semibold uppercase tracking-[0.08em]"
        style={{ color: accent }}
      >
        {isRoot ? "HOME" : "PAGE"}
      </div>
      <div
        className="mt-px overflow-hidden text-ellipsis whitespace-nowrap text-[14px] font-semibold leading-[1.3] text-[#1B2130]"
        title={node.title}
      >
        {node.title}
      </div>
      <div className="mt-[3px] overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[11px] text-[#7A8496]">
        {node.slug}
      </div>
    </div>
  );
}

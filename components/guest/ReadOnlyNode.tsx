"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Server } from "lucide-react";
import { colorForNode } from "@/lib/colors";
import { NODE_W } from "@/lib/layout";
import type { SitemapRFNode } from "@/lib/layout";

// Static, non-interactive card for the guest read-only view.
export function ReadOnlyNodeCard({ data }: NodeProps<SitemapRFNode>) {
  const { node, depth } = data;
  const isBackoffice = node.kind === "backoffice";
  const accent = isBackoffice ? "#5A6270" : colorForNode(node.color, depth);
  const isRoot = node.parentId === null;

  return (
    <div
      className={`relative select-none rounded-[11px] border px-3 pb-3 pt-[11px] shadow-[0_1px_2px_rgba(20,30,60,.06),0_6px_18px_rgba(20,30,60,.08)] ${
        isBackoffice ? "border-dashed border-[#C4CAD6] bg-[#F4F5F8]" : "border-[#E1E6EF] bg-white"
      }`}
      style={{ width: NODE_W }}
    >
      <span
        className="pointer-events-none absolute inset-x-[14px] top-0 h-[3px] rounded-b-[3px]"
        style={{ background: accent }}
      />
      <Handle
        id="t"
        type="target"
        position={Position.Top}
        isConnectable={false}
        className="!h-1 !w-1 !border-0 !bg-transparent !opacity-0"
      />
      <Handle
        id="rs"
        type="source"
        position={Position.Top}
        isConnectable={false}
        className="!h-1 !w-1 !border-0 !bg-transparent !opacity-0"
      />
      <Handle
        id="s"
        type="source"
        position={Position.Bottom}
        isConnectable={false}
        className="!h-1 !w-1 !border-0 !bg-transparent !opacity-0"
      />
      <Handle
        id="rt"
        type="target"
        position={Position.Bottom}
        isConnectable={false}
        className="!h-1 !w-1 !border-0 !bg-transparent !opacity-0"
      />
      <div
        className="flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-[0.08em]"
        style={{ color: accent }}
      >
        {isBackoffice && <Server className="h-[10px] w-[10px]" strokeWidth={2.4} />}
        {isBackoffice ? "BACK OFFICE" : isRoot ? "HOME" : "PAGE"}
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
      {node.notes && (
        <div className="mt-1.5 whitespace-pre-wrap break-words text-[12px] leading-[1.5] text-[#4A5468]">
          {node.notes}
        </div>
      )}
    </div>
  );
}

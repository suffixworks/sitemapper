"use client";

import { useEffect, useRef, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { CornerDownRight, Plus, Rows3, Trash2 } from "lucide-react";
import { colorForNode } from "@/lib/colors";
import { NODE_W } from "@/lib/layout";
import type { SitemapRFNode } from "@/lib/layout";
import { useSitemapStore } from "@/store/useSitemapStore";

function InlineEdit({
  value,
  mono,
  onCommit,
  onCancel,
}: {
  value: string;
  mono?: boolean;
  onCommit: (v: string) => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  return (
    <input
      ref={ref}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onCommit(v);
        } else if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      }}
      onBlur={() => onCommit(v)}
      className={`mt-px w-full rounded-[5px] bg-[#F3F4FA] px-[5px] py-0.5 font-semibold text-[#1B2130] outline-none ${
        mono ? "font-mono text-[11px] font-normal" : "text-[14px]"
      }`}
    />
  );
}

export function SitemapNodeCard({ id, data }: NodeProps<SitemapRFNode>) {
  const { node, depth } = data;
  const selected = useSitemapStore((s) => s.selectedId === id);
  const editing = useSitemapStore((s) => (s.editing?.id === id ? s.editing : null));

  const rename = useSitemapStore((s) => s.rename);
  const setSlug = useSitemapStore((s) => s.setSlug);
  const stopEditing = useSitemapStore((s) => s.stopEditing);
  const addChild = useSitemapStore((s) => s.addChild);
  const addSibling = useSitemapStore((s) => s.addSibling);
  const remove = useSitemapStore((s) => s.remove);
  const startEditing = useSitemapStore((s) => s.startEditing);

  const accent = colorForNode(node.color, depth);
  const isRoot = node.parentId === null;
  const reveal = selected ? "flex" : "hidden group-hover:flex";

  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  const act = (e: React.MouseEvent, fn: () => void) => {
    e.stopPropagation();
    fn();
  };

  return (
    <div
      className="group relative select-none rounded-[11px] border bg-white px-3 pb-3 pt-[11px] shadow-[0_1px_2px_rgba(20,30,60,.06),0_6px_18px_rgba(20,30,60,.08)] transition-shadow hover:shadow-[0_8px_30px_rgba(20,30,60,.16)]"
      style={{
        width: NODE_W,
        borderColor: selected ? "#4C46E5" : "#E1E6EF",
        boxShadow: selected
          ? "0 0 0 2px #EBEAFC, 0 8px 30px rgba(20,30,60,.16)"
          : undefined,
      }}
    >
      {/* top color bar */}
      <span
        className="pointer-events-none absolute inset-x-[14px] top-0 h-[3px] rounded-b-[3px]"
        style={{ background: accent }}
      />

      {/* invisible handles for edges */}
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

      {editing?.field === "title" ? (
        <InlineEdit
          value={node.title}
          onCommit={(v) => rename(id, v)}
          onCancel={stopEditing}
        />
      ) : (
        <div
          className="mt-px overflow-hidden text-ellipsis whitespace-nowrap text-[14px] font-semibold leading-[1.3] text-[#1B2130]"
          title={node.title}
          onDoubleClick={(e) => act(e, () => startEditing(id, "title"))}
        >
          {node.title}
        </div>
      )}

      {editing?.field === "slug" ? (
        <InlineEdit
          value={node.slug}
          mono
          onCommit={(v) => setSlug(id, v)}
          onCancel={stopEditing}
        />
      ) : (
        <div
          className="mt-[3px] overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[11px] text-[#7A8496]"
          onDoubleClick={(e) => act(e, () => startEditing(id, "slug"))}
        >
          {node.slug}
        </div>
      )}

      {/* hover toolbar */}
      <div
        className={`${reveal} absolute -top-[38px] left-1/2 -translate-x-1/2 items-center gap-px rounded-[9px] bg-[#14161C] p-[3px] shadow-[0_8px_30px_rgba(20,30,60,.16)]`}
        onPointerDown={stop}
      >
        <ToolButton label="Add child" onClick={(e) => act(e, () => addChild(id))}>
          <CornerDownRight />
        </ToolButton>
        <ToolButton label="Add sibling" onClick={(e) => act(e, () => addSibling(id))}>
          <Rows3 />
        </ToolButton>
        <span className="mx-0.5 h-[18px] w-px bg-[#2A2D37]" />
        <ToolButton label="Delete" danger onClick={(e) => act(e, () => remove(id))}>
          <Trash2 />
        </ToolButton>
      </div>

      {/* add-child FAB */}
      <button
        aria-label="Add child page"
        onPointerDown={stop}
        onClick={(e) => act(e, () => addChild(id))}
        className={`${reveal} absolute -bottom-[13px] left-1/2 h-[26px] w-[26px] -translate-x-1/2 items-center justify-center rounded-full border-2 border-white bg-[#4C46E5] text-white shadow-[0_1px_2px_rgba(20,30,60,.06),0_6px_18px_rgba(20,30,60,.08)] transition-transform hover:scale-110 hover:bg-[#5b55f0]`}
      >
        <Plus className="h-[14px] w-[14px]" strokeWidth={2.4} />
      </button>
    </div>
  );
}

function ToolButton({
  children,
  label,
  danger,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  danger?: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`grid h-7 w-7 place-items-center rounded-md text-[#C9CDD8] transition-colors ${
        danger ? "hover:bg-[#3a2426] hover:text-[#ff8a86]" : "hover:bg-[#2a2e39] hover:text-white"
      } [&_svg]:h-[15px] [&_svg]:w-[15px]`}
    >
      {children}
    </button>
  );
}

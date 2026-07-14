"use client";

import { useRef } from "react";
import {
  Download,
  FileJson,
  FileText,
  Image as ImageIcon,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { useReactFlow } from "@xyflow/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  exportImage,
  exportJSON,
  exportMarkdown,
  parseImportedDoc,
} from "@/lib/export";
import { useSitemapStore } from "@/store/useSitemapStore";

export function ExportMenu() {
  const { getNodes } = useReactFlow();
  const doc = useSitemapStore((s) => s.doc);
  const load = useSitemapStore((s) => s.load);
  const fileRef = useRef<HTMLInputElement>(null);

  const hasContent = !!doc.rootId;

  const image = (format: "png" | "jpeg") =>
    exportImage(getNodes(), format).catch(() => toast("Export failed"));

  const onImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseImportedDoc(String(reader.result));
      if (!parsed) {
        toast("Invalid sitemap JSON");
        return;
      }
      load(parsed);
      useSitemapStore.temporal.getState().clear();
      toast("Sitemap imported");
    };
    reader.readAsText(file);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex h-8 items-center gap-1.5 rounded-[7px] px-2.5 text-[13px] font-medium text-[#C9CDD8] transition-colors hover:bg-[#23262F] hover:text-white">
          <Download className="h-[15px] w-[15px]" />
          <span className="hidden sm:inline">Export</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem disabled={!hasContent} onClick={() => image("png")}>
            <ImageIcon className="h-4 w-4" /> PNG image
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!hasContent} onClick={() => image("jpeg")}>
            <ImageIcon className="h-4 w-4" /> JPG (presentation)
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!hasContent} onClick={() => exportJSON(doc)}>
            <FileJson className="h-4 w-4" /> JSON data
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!hasContent} onClick={() => exportMarkdown(doc)}>
            <FileText className="h-4 w-4" /> Markdown outline
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" /> Import JSON…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={onImport}
      />
    </>
  );
}

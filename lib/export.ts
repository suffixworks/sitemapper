// Client-side export helpers: PNG / presentation JPG (html-to-image on the React
// Flow viewport), JSON, and a Markdown outline. Import parses JSON back to a doc.
import { toJpeg, toPng } from "html-to-image";
import { getNodesBounds, type Node } from "@xyflow/react";
import { toOutline, type SitemapDoc } from "@/lib/tree";

function triggerDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}

export function downloadText(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  triggerDownload(url, filename);
  URL.revokeObjectURL(url);
}

export function exportJSON(doc: SitemapDoc) {
  downloadText("sitemap.json", JSON.stringify(doc, null, 2), "application/json");
}

export function exportMarkdown(doc: SitemapDoc) {
  downloadText("sitemap.md", toOutline(doc), "text/markdown");
}

/** Capture the full graph as a high-res image. `png` (2x) or presentation `jpeg` (2.5x). */
export async function exportImage(nodes: Node[], format: "png" | "jpeg") {
  const viewport = document.querySelector<HTMLElement>(".react-flow__viewport");
  if (!viewport || nodes.length === 0) return;

  await (document.fonts?.ready ?? Promise.resolve());

  const bounds = getNodesBounds(nodes);
  const pad = 80;
  const width = Math.ceil(bounds.width + pad * 2);
  const height = Math.ceil(bounds.height + pad * 2);
  const scale = format === "jpeg" ? 2.5 : 2;

  const options = {
    backgroundColor: "#ffffff",
    pixelRatio: scale,
    width,
    height,
    quality: 0.95,
    cacheBust: true,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      // Render the full graph at 100% with a white margin, top-left anchored.
      transform: `translate(${pad - bounds.x}px, ${pad - bounds.y}px) scale(1)`,
    },
  };

  const dataUrl =
    format === "jpeg" ? await toJpeg(viewport, options) : await toPng(viewport, options);
  triggerDownload(dataUrl, `sitemap.${format === "jpeg" ? "jpg" : "png"}`);
}

/** Parse an imported JSON string into a SitemapDoc, or null if invalid. */
export function parseImportedDoc(text: string): SitemapDoc | null {
  try {
    const obj = JSON.parse(text) as Partial<SitemapDoc>;
    if (typeof obj !== "object" || obj === null) return null;
    if (!("nodes" in obj) || typeof obj.nodes !== "object" || obj.nodes === null) return null;
    if (!("rootId" in obj)) return null;
    const rootId = obj.rootId ?? null;
    if (rootId !== null && !(rootId in (obj.nodes as object))) return null;
    return { rootId, nodes: obj.nodes } as SitemapDoc;
  } catch {
    return null;
  }
}

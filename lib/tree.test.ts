import { describe, it, expect } from "vitest";
import * as tree from "./tree";

// Deterministic id generator for tests.
function ids() {
  let i = 0;
  return () => `n${++i}`;
}

describe("slugify", () => {
  it("lowercases and dashes non-word chars", () => {
    expect(tree.slugify("Case Studies")).toBe("case-studies");
    expect(tree.slugify("  Hello / World!  ")).toBe("hello-world");
  });
  it("falls back to 'page' when empty", () => {
    expect(tree.slugify("")).toBe("page");
    expect(tree.slugify("  ///  ")).toBe("page");
  });
  it("keeps Thai characters", () => {
    expect(tree.slugify("หน้าแรก")).toBe("หน้าแรก");
  });
});

describe("createRoot / addChild", () => {
  it("creates a single-root doc", () => {
    const doc = tree.createRoot("r", "Home", "/");
    expect(doc.rootId).toBe("r");
    expect(doc.nodes.r.parentId).toBeNull();
    expect(doc.nodes.r.children).toEqual([]);
  });

  it("appends a child and links parent", () => {
    let doc = tree.createRoot("r");
    doc = tree.addChild(doc, "r", "c1", "About", "/about");
    expect(doc.nodes.r.children).toEqual(["c1"]);
    expect(doc.nodes.c1.parentId).toBe("r");
    expect(doc.nodes.c1.slug).toBe("/about");
  });

  it("derives a slug from the title when none given", () => {
    let doc = tree.createRoot("r");
    doc = tree.addChild(doc, "r", "c1", "Case Studies");
    expect(doc.nodes.c1.slug).toBe("/case-studies");
  });

  it("expands a collapsed parent on add", () => {
    let doc = tree.createRoot("r");
    doc = tree.addChild(doc, "r", "c1");
    doc = tree.toggleCollapse(doc, "r");
    expect(doc.nodes.r.collapsed).toBe(true);
    doc = tree.addChild(doc, "r", "c2");
    expect(doc.nodes.r.collapsed).toBe(false);
  });

  it("does not mutate the input doc", () => {
    const doc = tree.createRoot("r");
    const before = JSON.stringify(doc);
    tree.addChild(doc, "r", "c1");
    expect(JSON.stringify(doc)).toBe(before);
  });
});

describe("addSibling", () => {
  it("inserts immediately after the target", () => {
    let doc = tree.createRoot("r");
    doc = tree.addChild(doc, "r", "a");
    doc = tree.addChild(doc, "r", "b");
    doc = tree.addSibling(doc, "a", "x");
    expect(doc.nodes.r.children).toEqual(["a", "x", "b"]);
  });

  it("falls back to addChild for the root", () => {
    let doc = tree.createRoot("r");
    doc = tree.addSibling(doc, "r", "c1");
    expect(doc.nodes.r.children).toEqual(["c1"]);
    expect(doc.nodes.c1.parentId).toBe("r");
  });
});

describe("removeSubtree", () => {
  it("removes a node and all descendants", () => {
    const make = ids();
    let doc = tree.seedDemo(make);
    const rootId = doc.rootId!;
    const services = doc.nodes[rootId].children[1];
    const countBefore = Object.keys(doc.nodes).length;
    const subtree = 1 + tree.descendantCount(doc, services);
    doc = tree.removeSubtree(doc, services);
    expect(doc.nodes[services]).toBeUndefined();
    expect(doc.nodes[rootId].children).not.toContain(services);
    expect(Object.keys(doc.nodes).length).toBe(countBefore - subtree);
  });

  it("empties the doc when removing the root", () => {
    let doc = tree.createRoot("r");
    doc = tree.addChild(doc, "r", "c1");
    doc = tree.removeSubtree(doc, "r");
    expect(doc.rootId).toBeNull();
    expect(doc.nodes).toEqual({});
  });
});

describe("rename / setSlug", () => {
  it("renames, defaulting blank to Untitled", () => {
    let doc = tree.createRoot("r", "Home");
    doc = tree.rename(doc, "r", "Landing");
    expect(doc.nodes.r.title).toBe("Landing");
    doc = tree.rename(doc, "r", "   ");
    expect(doc.nodes.r.title).toBe("Untitled");
  });

  it("ensures a leading slash and regenerates from title when blank", () => {
    let doc = tree.createRoot("r", "Home");
    doc = tree.addChild(doc, "r", "c1", "Blog", "/blog");
    doc = tree.setSlug(doc, "c1", "articles");
    expect(doc.nodes.c1.slug).toBe("/articles");
    doc = tree.setSlug(doc, "c1", "");
    expect(doc.nodes.c1.slug).toBe("/blog");
  });
});

describe("reorder", () => {
  it("swaps with the neighbor and is a no-op at the ends", () => {
    let doc = tree.createRoot("r");
    doc = tree.addChild(doc, "r", "a");
    doc = tree.addChild(doc, "r", "b");
    doc = tree.addChild(doc, "r", "c");
    doc = tree.reorder(doc, "b", -1);
    expect(doc.nodes.r.children).toEqual(["b", "a", "c"]);
    const same = tree.reorder(doc, "b", -1); // already first
    expect(same.nodes.r.children).toEqual(["b", "a", "c"]);
  });
});

describe("setColor", () => {
  it("sets, then clears when the same color is applied again", () => {
    let doc = tree.createRoot("r");
    doc = tree.setColor(doc, "r", "#D9534F");
    expect(doc.nodes.r.color).toBe("#D9534F");
    doc = tree.setColor(doc, "r", "#D9534F");
    expect(doc.nodes.r.color).toBeNull();
  });
});

describe("descendantCount / depthOf", () => {
  it("counts the whole subtree and reports depth", () => {
    const doc = tree.seedDemo(ids());
    const rootId = doc.rootId!;
    expect(tree.descendantCount(doc, rootId)).toBe(11);
    const services = doc.nodes[rootId].children[1];
    expect(tree.depthOf(doc, services)).toBe(1);
    const strategy = doc.nodes[services].children[0];
    expect(tree.depthOf(doc, strategy)).toBe(2);
  });
});

describe("toOutline", () => {
  it("emits an indented Markdown outline", () => {
    let doc = tree.createRoot("r", "Home", "/");
    doc = tree.addChild(doc, "r", "a", "About", "/about");
    const md = tree.toOutline(doc);
    expect(md).toContain("- Home `/`");
    expect(md).toContain("  - About `/about`");
  });
});

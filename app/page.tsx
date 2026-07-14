import { EditorShell } from "@/components/editor/EditorShell";

// Phase 1: the editor is the whole app (local, no DB yet). In Phase 3 this route
// becomes the staff dashboard and the editor moves to /editor/[id].
export default function Home() {
  return <EditorShell />;
}

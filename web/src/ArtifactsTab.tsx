import { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ArtifactMeta, ArtifactFull } from "./types";

interface ArtifactsTabProps {
  artifacts: ArtifactMeta[];
  detail: ArtifactFull | null;
  isOwner: boolean;
  onCreate: (opts: { mode: "ai" | "manual"; artifactType: string; title?: string; content?: string }) => void;
  onDelete: (id: string) => void;
  onOpen: (id: string) => void;
  onCloseDetail: () => void;
}

const TYPES = ["summary", "plan", "notes", "custom"] as const;

export function ArtifactsTab({ artifacts, detail, isOwner, onCreate, onDelete, onOpen, onCloseDetail }: ArtifactsTabProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [mode, setMode] = useState<"ai" | "manual">("ai");
  const [artifactType, setArtifactType] = useState<string>("summary");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const submit = () => {
    onCreate({ mode, artifactType, title: title || undefined, content: mode === "manual" ? content : undefined });
    setShowCreate(false);
    setTitle("");
    setContent("");
  };

  // Detail view
  if (detail) {
    return (
      <div className="space-y-3">
        <button onClick={onCloseDetail} className="text-xs text-zinc-500 hover:text-zinc-300">&larr; Back to list</button>
        <div className="rounded bg-zinc-800/50 p-3">
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] uppercase text-zinc-400">{detail.type}</span>
            <h3 className="text-sm font-medium text-zinc-200">{detail.title}</h3>
          </div>
          <p className="mb-2 text-[10px] text-zinc-600">
            by {detail.createdBy} at {new Date(detail.createdAt).toLocaleString()}
          </p>
          <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-zinc-900 prose-pre:text-zinc-300">
            <Markdown remarkPlugins={[remarkGfm]}>{detail.content}</Markdown>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => navigator.clipboard.writeText(detail.content)}
              className="rounded bg-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-600"
            >
              Copy
            </button>
            {isOwner && (
              confirmDelete === detail.id ? (
                <button onClick={() => { onDelete(detail.id); onCloseDetail(); setConfirmDelete(null); }} className="rounded bg-red-900/50 px-2 py-1 text-xs text-red-400 hover:bg-red-900/70">
                  Confirm Delete
                </button>
              ) : (
                <button onClick={() => setConfirmDelete(detail.id)} className="rounded bg-zinc-700 px-2 py-1 text-xs text-red-400 hover:bg-zinc-600">
                  Delete
                </button>
              )
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => setShowCreate(!showCreate)}
        className="w-full rounded bg-zinc-800 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
      >
        {showCreate ? "Cancel" : "+ New Artifact"}
      </button>

      {showCreate && (
        <div className="space-y-2 rounded bg-zinc-800/50 p-3">
          <div className="flex gap-2">
            {TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setArtifactType(t)}
                className={`rounded px-2 py-0.5 text-xs ${artifactType === t ? "bg-zinc-600 text-zinc-200" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"}`}
              >
                {t}
              </button>
            ))}
          </div>
          <input
            className="w-full rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-200 outline-none"
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              onClick={() => setMode("ai")}
              className={`flex-1 rounded py-1 text-xs ${mode === "ai" ? "bg-sky-900/40 text-sky-400" : "bg-zinc-800 text-zinc-500"}`}
            >
              AI Generate
            </button>
            <button
              onClick={() => setMode("manual")}
              className={`flex-1 rounded py-1 text-xs ${mode === "manual" ? "bg-zinc-600 text-zinc-200" : "bg-zinc-800 text-zinc-500"}`}
            >
              Manual
            </button>
          </div>
          {mode === "manual" && (
            <textarea
              className="w-full resize-none rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-200 outline-none"
              rows={4}
              placeholder="Enter content..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          )}
          <button onClick={submit} className="w-full rounded bg-zinc-700 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-600">
            Create
          </button>
        </div>
      )}

      {/* List */}
      {artifacts.length === 0 && !showCreate && (
        <p className="text-center text-xs text-zinc-600">No artifacts yet</p>
      )}
      {artifacts.map((a) => (
        <button
          key={a.id}
          onClick={() => onOpen(a.id)}
          className="w-full rounded bg-zinc-800/50 p-2.5 text-left hover:bg-zinc-800"
        >
          <div className="flex items-center gap-2">
            <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] uppercase text-zinc-500">{a.type}</span>
            <span className="text-xs font-medium text-zinc-300">{a.title}</span>
          </div>
          <p className="mt-1 text-[10px] text-zinc-600">
            by {a.createdBy} - {new Date(a.createdAt).toLocaleString()}
          </p>
        </button>
      ))}
    </div>
  );
}

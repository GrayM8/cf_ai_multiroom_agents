import { useState } from "react";
import type { PinnedMemory } from "./types";

interface MemoryTabProps {
  pinned: PinnedMemory;
  onAdd: (kind: "memories" | "todos", text: string) => void;
  onRemove: (kind: "memories" | "todos", index: number) => void;
  onToggle: (index: number) => void;
}

function InlineInput({ placeholder, onSubmit }: { placeholder: string; onSubmit: (v: string) => void }) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-[11px] text-emerald-600 transition hover:text-emerald-400">
        + Add
      </button>
    );
  }

  return (
    <div className="mt-1.5 flex gap-1.5">
      <input
        autoFocus
        className="flex-1 rounded border border-zinc-800 bg-zinc-950/60 px-2.5 py-1 text-xs text-zinc-200 outline-none transition placeholder:text-zinc-600 focus:border-zinc-600"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) { onSubmit(value.trim()); setValue(""); setOpen(false); }
          if (e.key === "Escape") setOpen(false);
        }}
      />
      <button
        onClick={() => { if (value.trim()) { onSubmit(value.trim()); setValue(""); setOpen(false); } }}
        className="rounded bg-emerald-600 px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-emerald-500"
      >
        Save
      </button>
    </div>
  );
}

function TrashButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="ml-auto flex-shrink-0 text-zinc-700 transition hover:text-red-400"
      title="Delete"
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
      </svg>
    </button>
  );
}

export function MemoryTab({ pinned, onAdd, onRemove, onToggle }: MemoryTabProps) {
  return (
    <div className="space-y-5 text-sm">
      {/* Pinned Memories */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[11px] font-medium uppercase tracking-widest text-zinc-500">Pinned Memories</h3>
          <InlineInput placeholder="Add memory..." onSubmit={(v) => onAdd("memories", v)} />
        </div>
        {pinned.memories.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-800/60 px-3 py-4 text-center">
            <p className="text-[11px] text-zinc-600">No pinned memories yet</p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {pinned.memories.map((m, i) => (
              <li key={i} className="flex items-center gap-2 rounded border border-zinc-800/40 bg-zinc-900/30 px-2.5 py-1.5 text-xs text-zinc-400">
                <span className="h-1 w-1 flex-shrink-0 rounded-full bg-emerald-500/50" />
                <span className="flex-1">{m}</span>
                <TrashButton onClick={() => onRemove("memories", i)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Todos */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[11px] font-medium uppercase tracking-widest text-zinc-500">Todos</h3>
          <InlineInput placeholder="Add todo..." onSubmit={(v) => onAdd("todos", v)} />
        </div>
        {pinned.todos.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-800/60 px-3 py-4 text-center">
            <p className="text-[11px] text-zinc-600">No todos yet</p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {pinned.todos.map((t, i) => (
              <li key={i} className="flex items-center gap-2 rounded border border-zinc-800/40 bg-zinc-900/30 px-2.5 py-1.5 text-xs text-zinc-400">
                <button
                  onClick={() => onToggle(i)}
                  className={`flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded border transition ${
                    t.done ? "border-emerald-500/50 bg-emerald-500/20" : "border-zinc-700 hover:border-zinc-500"
                  }`}
                  title={t.done ? "Mark incomplete" : "Mark complete"}
                >
                  {t.done && (
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
                <span className={`flex-1 ${t.done ? "text-zinc-600 line-through" : ""}`}>{t.text}</span>
                <TrashButton onClick={() => onRemove("todos", i)} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

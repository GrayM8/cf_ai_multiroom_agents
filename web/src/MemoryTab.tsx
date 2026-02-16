import { useState } from "react";
import type { PinnedMemory } from "./types";

interface MemoryTabProps {
  pinned: PinnedMemory;
  onAdd: (kind: "memories" | "todos", text: string) => void;
}

function InlineInput({ placeholder, onSubmit }: { placeholder: string; onSubmit: (v: string) => void }) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs text-zinc-500 hover:text-zinc-300">
        + Add
      </button>
    );
  }

  return (
    <div className="mt-1 flex gap-1">
      <input
        autoFocus
        className="flex-1 rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-200 outline-none focus:ring-1 focus:ring-zinc-600"
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
        className="rounded bg-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-600"
      >
        Save
      </button>
    </div>
  );
}

export function MemoryTab({ pinned, onAdd }: MemoryTabProps) {
  return (
    <div className="space-y-4 text-sm">
      {/* Pinned Memories */}
      <section>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Pinned Memories</h3>
          <InlineInput placeholder="Add memory..." onSubmit={(v) => onAdd("memories", v)} />
        </div>
        {pinned.memories.length === 0 ? (
          <p className="text-xs text-zinc-600">No pinned memories yet</p>
        ) : (
          <ul className="space-y-1">
            {pinned.memories.map((m, i) => <li key={i} className="text-xs text-zinc-400">- {m}</li>)}
          </ul>
        )}
      </section>

      {/* Todos */}
      <section>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Todos</h3>
          <InlineInput placeholder="Add todo..." onSubmit={(v) => onAdd("todos", v)} />
        </div>
        {pinned.todos.length === 0 ? (
          <p className="text-xs text-zinc-600">No todos yet</p>
        ) : (
          <ul className="space-y-1">
            {pinned.todos.map((t, i) => <li key={i} className="text-xs text-zinc-400">- {t}</li>)}
          </ul>
        )}
      </section>
    </div>
  );
}

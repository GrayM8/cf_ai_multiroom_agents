import { useState } from "react";
import type { PinnedMemory } from "./types";

interface MemoryTabProps {
  pinned: PinnedMemory;
  onAdd: (kind: "facts" | "decisions" | "todos", text: string) => void;
  onSetGoal: (text: string) => void;
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

export function MemoryTab({ pinned, onAdd, onSetGoal }: MemoryTabProps) {
  const [editGoal, setEditGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState(pinned.goal ?? "");

  return (
    <div className="space-y-4 text-sm">
      {/* Goal */}
      <section>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">Goal</h3>
        {editGoal ? (
          <div className="flex gap-1">
            <input
              autoFocus
              className="flex-1 rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-200 outline-none"
              value={goalDraft}
              onChange={(e) => setGoalDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { onSetGoal(goalDraft); setEditGoal(false); }
                if (e.key === "Escape") setEditGoal(false);
              }}
            />
            <button onClick={() => { onSetGoal(goalDraft); setEditGoal(false); }} className="rounded bg-zinc-700 px-2 py-1 text-xs text-zinc-300">Set</button>
          </div>
        ) : (
          <p
            className="cursor-pointer text-zinc-400 hover:text-zinc-200"
            onClick={() => { setGoalDraft(pinned.goal ?? ""); setEditGoal(true); }}
          >
            {pinned.goal || "Click to set a goal..."}
          </p>
        )}
      </section>

      {/* Facts */}
      <section>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Facts</h3>
          <InlineInput placeholder="Add fact..." onSubmit={(v) => onAdd("facts", v)} />
        </div>
        {pinned.facts.length === 0 ? (
          <p className="text-xs text-zinc-600">No facts yet</p>
        ) : (
          <ul className="space-y-1">
            {pinned.facts.map((f, i) => <li key={i} className="text-xs text-zinc-400">- {f}</li>)}
          </ul>
        )}
      </section>

      {/* Decisions */}
      <section>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Decisions</h3>
          <InlineInput placeholder="Add decision..." onSubmit={(v) => onAdd("decisions", v)} />
        </div>
        {pinned.decisions.length === 0 ? (
          <p className="text-xs text-zinc-600">No decisions yet</p>
        ) : (
          <ul className="space-y-1">
            {pinned.decisions.map((d, i) => <li key={i} className="text-xs text-zinc-400">- {d}</li>)}
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

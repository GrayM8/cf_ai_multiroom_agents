import { useState } from "react";
import { useLocation } from "wouter";

const DISPLAY_NAME_KEY = "agentworkspaces-display-name";

function randomRoomId() {
  const adjectives = ["swift", "bright", "calm", "bold", "keen", "warm", "cool", "sharp"];
  const nouns = ["falcon", "summit", "river", "forge", "orbit", "prism", "spark", "nexus"];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 900 + 100);
  return `${adj}-${noun}-${num}`;
}

export function Splash() {
  const [, navigate] = useLocation();
  const [joinId, setJoinId] = useState("");
  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem(DISPLAY_NAME_KEY) || "",
  );

  const saveNameAndGo = (roomId: string) => {
    if (displayName.trim()) {
      localStorage.setItem(DISPLAY_NAME_KEY, displayName.trim());
    }
    navigate(`/r/${encodeURIComponent(roomId)}`);
  };

  const handleCreate = () => {
    saveNameAndGo(randomRoomId());
  };

  const handleJoin = () => {
    const id = joinId.trim();
    if (id) saveNameAndGo(id);
  };

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-zinc-950 text-zinc-100">
      <div className="w-full max-w-md space-y-8 px-6">
        {/* Hero */}
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">AgentWorkspaces</h1>
          <p className="mt-3 text-zinc-400">
            Real-time collaboration rooms with a shared AI host, pinned memory, and artifacts.
          </p>
        </div>

        {/* Display Name */}
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-500">
            Display Name
          </label>
          <input
            className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm text-zinc-200 outline-none ring-1 ring-zinc-800 placeholder:text-zinc-600 focus:ring-zinc-600"
            placeholder="Enter your name..."
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        {/* Create Room */}
        <button
          onClick={handleCreate}
          className="w-full rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
        >
          Create Room
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-800" />
          <span className="text-xs text-zinc-600">or join an existing room</span>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        {/* Join Room */}
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm text-zinc-200 outline-none ring-1 ring-zinc-800 placeholder:text-zinc-600 focus:ring-zinc-600"
            placeholder="Room ID..."
            value={joinId}
            onChange={(e) => setJoinId(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleJoin(); }}
          />
          <button
            onClick={handleJoin}
            disabled={!joinId.trim()}
            className="rounded-lg bg-zinc-800 px-5 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-700 disabled:opacity-40"
          >
            Join
          </button>
        </div>
      </div>
    </div>
  );
}

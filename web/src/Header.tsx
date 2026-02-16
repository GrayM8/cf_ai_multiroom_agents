import type { ConnectionStatus } from "./types";

const STATUS_COLORS: Record<ConnectionStatus, string> = {
  connected: "bg-emerald-500",
  connecting: "bg-yellow-500",
  disconnected: "bg-zinc-600",
};

const STATUS_LABELS: Record<ConnectionStatus, string> = {
  connected: "Connected",
  connecting: "Connecting...",
  disconnected: "Disconnected",
};

interface HeaderProps {
  roomId: string;
  displayName: string;
  setDisplayName: (v: string) => void;
  status: ConnectionStatus;
  presence: number;
  onDisconnect: () => void;
  onExport: () => void;
  onReset: () => void;
}

export function Header({
  roomId, displayName, setDisplayName,
  status, presence,
  onDisconnect, onExport, onReset,
}: HeaderProps) {
  const copyInvite = () => {
    const url = `${window.location.origin}/r/${encodeURIComponent(roomId)}`;
    navigator.clipboard.writeText(url);
  };

  return (
    <header className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-900 px-4 py-2.5">
      <h1 className="text-lg font-semibold tracking-tight text-zinc-100">AgentWorkspaces</h1>
      <span className="text-sm text-zinc-500">/</span>
      <span className="text-sm font-mono text-zinc-400">{roomId}</span>

      <input
        className="w-32 rounded bg-zinc-800 px-2 py-1 text-sm text-zinc-200 outline-none focus:ring-1 focus:ring-zinc-600"
        placeholder="Display name"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
      />

      <button onClick={onDisconnect} className="rounded bg-zinc-700 px-3 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-600">
        Leave
      </button>

      <div className="ml-auto flex items-center gap-3">
        {/* Status */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span className={`inline-block h-2 w-2 rounded-full ${STATUS_COLORS[status]}`} />
          {STATUS_LABELS[status]}
        </div>

        {/* Presence pill */}
        {status === "connected" && (
          <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-300">
            {presence} online
          </span>
        )}

        {/* Actions */}
        {status === "connected" && (
          <>
            <button onClick={copyInvite} className="text-xs text-zinc-500 hover:text-zinc-300" title="Copy invite link">
              Invite
            </button>
            <button onClick={onExport} className="text-xs text-zinc-500 hover:text-zinc-300">
              Export
            </button>
            <button onClick={onReset} className="text-xs text-red-500/70 hover:text-red-400">
              Reset
            </button>
          </>
        )}
      </div>
    </header>
  );
}

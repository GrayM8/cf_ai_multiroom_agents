import { useCallback, useEffect, useRef, useState } from "react";

const WORKER_URL = import.meta.env.VITE_WORKER_URL ?? "http://localhost:8787";
const PING_INTERVAL_MS = 15_000;

interface ChatMsg {
  type: "chat";
  user: string;
  text: string;
  ts: number;
}

interface PresenceMsg {
  type: "presence";
  count: number;
}

interface ExportMsg {
  type: "export";
  data: unknown;
}

type ServerMsg = ChatMsg | PresenceMsg | ExportMsg | { type: "pong" };

function getClientId(): string {
  const key = "edgerooms-client-id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

const CLIENT_ID = getClientId();

function randomName() {
  return "User" + Math.floor(Math.random() * 9000 + 1000);
}

export default function App() {
  const [roomId, setRoomId] = useState(
    () => new URLSearchParams(window.location.search).get("room") ?? "demo",
  );
  const [displayName, setDisplayName] = useState(randomName);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [presence, setPresence] = useState(0);
  const [status, setStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [exportData, setExportData] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const displayNameRef = useRef(displayName);
  displayNameRef.current = displayName;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const closeSocket = useCallback(() => {
    if (pingRef.current) {
      clearInterval(pingRef.current);
      pingRef.current = null;
    }
    const ws = wsRef.current;
    if (!ws) return;
    wsRef.current = null;
    console.log(`[ws] closing socket readyState=${ws.readyState}`);
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close(1000, "client disconnect");
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      closeSocket();
    };
  }, [closeSocket]);

  const connect = useCallback(() => {
    if (wsRef.current) {
      console.log(`[ws] connect called but socket exists readyState=${wsRef.current.readyState}`);
      return;
    }

    setStatus("connecting");
    const wsUrl = WORKER_URL.replace(/^http/, "ws") + "/ws/" + encodeURIComponent(roomId);
    console.log(`[ws] connecting to ${wsUrl}`);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.addEventListener("open", () => {
      if (wsRef.current !== ws) {
        console.log("[ws] open fired for stale socket, closing");
        ws.close(1000, "stale");
        return;
      }
      console.log("[ws] open");
      setStatus("connected");

      // Send hello handshake
      ws.send(JSON.stringify({ type: "hello", clientId: CLIENT_ID, user: displayNameRef.current }));

      // Start ping interval
      pingRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, PING_INTERVAL_MS);
    });

    ws.addEventListener("message", (e) => {
      const msg: ServerMsg = JSON.parse(e.data);
      if (msg.type === "chat") {
        setMessages((prev) => [...prev, msg]);
      } else if (msg.type === "presence") {
        setPresence(msg.count);
      } else if (msg.type === "export") {
        setExportData(JSON.stringify((msg as ExportMsg).data, null, 2));
      }
      // pong is silently consumed
    });

    ws.addEventListener("close", (e) => {
      console.log(`[ws] close code=${e.code} reason=${e.reason}`);
      if (pingRef.current) {
        clearInterval(pingRef.current);
        pingRef.current = null;
      }
      if (wsRef.current === ws) {
        wsRef.current = null;
        setStatus("disconnected");
      }
    });

    ws.addEventListener("error", (e) => {
      console.log("[ws] error", e);
    });
  }, [roomId]);

  const disconnect = useCallback(() => {
    console.log("[ws] disconnect clicked");
    closeSocket();
    setStatus("disconnected");
  }, [closeSocket]);

  const send = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !input.trim()) return;
    wsRef.current.send(JSON.stringify({ type: "chat", user: displayName, text: input.trim() }));
    setInput("");
  }, [displayName, input]);

  const connected = status === "connected";

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: "1.5rem", maxWidth: 600 }}>
      <h1 style={{ margin: "0 0 1rem" }}>EdgeRooms</h1>

      {/* Config row */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
        <input
          placeholder="Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          disabled={status !== "disconnected"}
          style={{ width: 120 }}
        />
        <input
          placeholder="Display name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          style={{ width: 140 }}
        />
        {status === "disconnected" ? (
          <button onClick={connect} disabled={!roomId}>
            Connect
          </button>
        ) : (
          <button onClick={disconnect}>Disconnect</button>
        )}
      </div>

      {/* Status */}
      <div style={{ fontSize: "0.85rem", marginBottom: "0.75rem", color: "#666" }}>
        Status: <strong>{status}</strong>
        {connected && <> &mdash; {presence} user{presence !== 1 ? "s" : ""} online</>}
      </div>

      {/* Messages */}
      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: 4,
          height: 300,
          overflowY: "auto",
          padding: "0.5rem",
          marginBottom: "0.5rem",
          background: "#fafafa",
        }}
      >
        {messages.map((m, i) => {
          const isAI = m.user === "AI";
          const isSystem = m.user === "System";
          return (
            <div
              key={i}
              style={{
                marginBottom: "0.25rem",
                ...(isSystem ? { color: "#888", fontStyle: "italic", fontSize: "0.85rem" } : {}),
                ...(isAI ? { background: "#e8f4fd", padding: "0.25rem 0.4rem", borderRadius: 3 } : {}),
              }}
            >
              <strong>{m.user}</strong>: {m.text}
              <span style={{ color: "#999", fontSize: "0.75rem", marginLeft: 8 }}>
                {new Date(m.ts).toLocaleTimeString()}
              </span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input
          style={{ flex: 1 }}
          placeholder={connected ? "Type a message..." : "Connect first"}
          value={input}
          disabled={!connected}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button onClick={send} disabled={!connected || !input.trim()}>
          Send
        </button>
      </div>

      {/* Export modal */}
      {exportData && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
          }}
          onClick={() => setExportData(null)}
        >
          <div
            style={{ background: "#fff", borderRadius: 8, padding: "1rem", maxWidth: 500, width: "90%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 0.5rem" }}>Room Export</h3>
            <textarea
              readOnly
              value={exportData}
              style={{ width: "100%", height: 250, fontFamily: "monospace", fontSize: "0.8rem" }}
            />
            <button style={{ marginTop: "0.5rem" }} onClick={() => setExportData(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { DurableObject } from "cloudflare:workers";
import type { Env } from "./index";

const HEARTBEAT_INTERVAL_MS = 30_000;
const STALE_TIMEOUT_MS = 45_000;
const MAX_HISTORY = 50;
const AI_CONTEXT_MESSAGES = 20;
const AI_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const HISTORY_FLUSH_INTERVAL = 5; // persist every N messages
const PINNED_FLUSH_DELAY_MS = 1000; // debounce pinned writes

let nextConnId = 1;

interface ChatEntry {
  user: string;
  text: string;
  ts: number;
}

interface PinnedMemory {
  goal?: string;
  facts: string[];
  decisions: string[];
  todos: string[];
}

// Storage keys
const SK_PINNED = "pinned";
const SK_HISTORY = "history";
const SK_OWNER = "ownerId";

export class Room extends DurableObject<Env> {
  private connIds = new Map<WebSocket, string>();
  private clientIds = new Map<WebSocket, string>();
  private lastSeen = new Map<WebSocket, number>();
  private heartbeatAlarm = false;
  private history: ChatEntry[] = [];
  private pinned: PinnedMemory = { facts: [], decisions: [], todos: [] };
  private ownerId: string | null = null;
  private aiRunning = false;

  // Persistence bookkeeping
  private loaded = false;
  private historyDirty = 0; // messages since last flush
  private pinnedFlushTimer: ReturnType<typeof setTimeout> | null = null;

  private async ensureLoaded() {
    if (this.loaded) return;
    this.loaded = true;

    const map = await this.ctx.storage.get([SK_PINNED, SK_HISTORY, SK_OWNER]);
    if (map.has(SK_PINNED)) {
      this.pinned = map.get(SK_PINNED) as PinnedMemory;
    }
    if (map.has(SK_HISTORY)) {
      this.history = map.get(SK_HISTORY) as ChatEntry[];
    }
    if (map.has(SK_OWNER)) {
      this.ownerId = map.get(SK_OWNER) as string;
    }

    console.log(`[room] loaded state: pinned.facts=${this.pinned.facts.length} history=${this.history.length} owner=${this.ownerId ?? "none"}`);
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 400 });
    }

    await this.ensureLoaded();

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    const connId = `c${nextConnId++}`;
    this.ctx.acceptWebSocket(server);
    this.connIds.set(server, connId);
    this.lastSeen.set(server, Date.now());

    console.log(`[room] connect ${connId} | total=${this.getOpenSockets().length}`);

    await this.ensureHeartbeatAlarm();
    this.broadcastPresence();

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    if (typeof raw !== "string") return;

    let msg: { type?: string; user?: string; text?: string; clientId?: string };
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    this.lastSeen.set(ws, Date.now());

    if (msg.type === "ping") {
      ws.send(JSON.stringify({ type: "pong" }));
      return;
    }

    if (msg.type === "hello") {
      await this.ensureLoaded();
      const clientId = typeof msg.clientId === "string" ? msg.clientId : null;
      if (clientId) {
        this.clientIds.set(ws, clientId);
        if (!this.ownerId) {
          this.ownerId = clientId;
          await this.ctx.storage.put(SK_OWNER, this.ownerId);
          console.log(`[room] owner set to ${clientId}`);
        }
      }
      // Send current history to the joining client
      for (const entry of this.history) {
        ws.send(JSON.stringify({ type: "chat", ...entry }));
      }
      return;
    }

    if (msg.type !== "chat") return;
    if (typeof msg.user !== "string" || msg.user.length === 0 || msg.user.length > 64) return;
    if (typeof msg.text !== "string" || msg.text.length === 0 || msg.text.length > 2000) return;

    const text = msg.text.trim();
    const user = msg.user;

    // Broadcast the user's message first
    this.broadcastChat(user, text);

    // Handle commands
    if (text.startsWith("/remember ")) {
      const fact = text.slice("/remember ".length).trim();
      if (fact) {
        this.pinned.facts.push(fact);
        this.broadcastSystem(`Remembered: "${fact}"`);
        this.schedulePinnedFlush();
      }
    } else if (text.startsWith("/decide ")) {
      const decision = text.slice("/decide ".length).trim();
      if (decision) {
        this.pinned.decisions.push(decision);
        this.broadcastSystem(`Decision recorded: "${decision}"`);
        this.schedulePinnedFlush();
      }
    } else if (text.startsWith("/todo ")) {
      const todo = text.slice("/todo ".length).trim();
      if (todo) {
        this.pinned.todos.push(todo);
        this.broadcastSystem(`Todo added: "${todo}"`);
        this.schedulePinnedFlush();
      }
    } else if (text === "/memory") {
      this.broadcastSystem(this.formatPinnedMemory() || "No pinned memory yet.");
    } else if (text === "/export") {
      const data = { pinned: this.pinned, history: this.history, ownerId: this.ownerId };
      this.broadcast({ type: "export", data });
    } else if (text === "/reset") {
      const clientId = this.clientIds.get(ws);
      if (!clientId || clientId !== this.ownerId) {
        ws.send(JSON.stringify({ type: "chat", user: "System", text: "Only the room owner can /reset.", ts: Date.now() }));
        return;
      }
      this.pinned = { facts: [], decisions: [], todos: [] };
      this.history = [];
      await this.ctx.storage.put({ [SK_PINNED]: this.pinned, [SK_HISTORY]: this.history });
      this.broadcastSystem("Room has been reset by the owner.");
    } else if (text === "/summarize") {
      this.triggerAI("Summarize the recent discussion concisely. Highlight key points, open questions, and any decisions made.");
    } else if (text.startsWith("@ai ")) {
      const question = text.slice("@ai ".length).trim();
      if (question) {
        this.triggerAI(question);
      }
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    const connId = this.connIds.get(ws) ?? "?";
    console.log(`[room] close ${connId} code=${code} reason=${reason} wasClean=${wasClean}`);
    this.cleanup(ws);
    this.broadcastPresence();
  }

  async webSocketError(ws: WebSocket, error: unknown) {
    const connId = this.connIds.get(ws) ?? "?";
    console.log(`[room] error ${connId}: ${error}`);
    this.cleanup(ws);
    this.broadcastPresence();
  }

  async alarm() {
    this.heartbeatAlarm = false;
    const now = Date.now();
    let culled = 0;

    for (const ws of this.ctx.getWebSockets()) {
      const last = this.lastSeen.get(ws) ?? 0;
      if (now - last > STALE_TIMEOUT_MS && ws.readyState === WebSocket.READY_STATE_OPEN) {
        const connId = this.connIds.get(ws) ?? "?";
        console.log(`[room] stale-close ${connId} (last seen ${now - last}ms ago)`);
        this.cleanup(ws);
        culled++;
      }
    }

    if (culled > 0) {
      this.broadcastPresence();
    }

    if (this.getOpenSockets().length > 0) {
      await this.ensureHeartbeatAlarm();
    }
  }

  // --- Persistence ---

  private schedulePinnedFlush() {
    if (this.pinnedFlushTimer) return;
    this.pinnedFlushTimer = setTimeout(() => {
      this.pinnedFlushTimer = null;
      this.ctx.storage.put(SK_PINNED, this.pinned);
      console.log("[room] flushed pinned");
    }, PINNED_FLUSH_DELAY_MS);
  }

  private maybeFlushHistory() {
    this.historyDirty++;
    if (this.historyDirty >= HISTORY_FLUSH_INTERVAL) {
      this.historyDirty = 0;
      this.ctx.storage.put(SK_HISTORY, this.history);
      console.log("[room] flushed history");
    }
  }

  // --- AI ---

  private triggerAI(userPrompt: string) {
    if (this.aiRunning) {
      this.broadcastSystem("AI is already thinking... please wait.");
      return;
    }
    this.aiRunning = true;
    this.broadcastSystem("AI is thinking...");

    this.callAI(userPrompt)
      .then((response) => {
        this.broadcastChat("AI", response);
      })
      .catch((err) => {
        console.log(`[room] AI error: ${err}`);
        this.broadcastSystem(`AI error: ${String(err)}`);
      })
      .finally(() => {
        this.aiRunning = false;
      });
  }

  private async callAI(userPrompt: string): Promise<string> {
    const memoryBlock = this.formatPinnedMemory();
    const recentMessages = this.history
      .slice(-AI_CONTEXT_MESSAGES)
      .map((m) => `${m.user}: ${m.text}`)
      .join("\n");

    const systemPrompt = [
      "You are the AI host of a collaborative chat room called EdgeRooms.",
      "You help summarize, clarify decisions, and answer questions.",
      "Be concise and helpful.",
      "",
      memoryBlock ? `## Pinned Memory\n${memoryBlock}` : "## Pinned Memory\n(none yet)",
      "",
      recentMessages ? `## Recent Messages\n${recentMessages}` : "## Recent Messages\n(none yet)",
    ].join("\n");

    console.log(`[room] AI prompt system=${systemPrompt.length}chars user="${userPrompt.slice(0, 80)}"`);

    const result = await this.env.AI.run(AI_MODEL, {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const text = (result as { response?: string }).response;
    if (typeof text !== "string" || text.length === 0) {
      throw new Error("Empty AI response");
    }
    return text;
  }

  private formatPinnedMemory(): string {
    const parts: string[] = [];
    if (this.pinned.goal) parts.push(`Goal: ${this.pinned.goal}`);
    if (this.pinned.facts.length > 0) parts.push(`Facts:\n${this.pinned.facts.map((f) => `- ${f}`).join("\n")}`);
    if (this.pinned.decisions.length > 0)
      parts.push(`Decisions:\n${this.pinned.decisions.map((d) => `- ${d}`).join("\n")}`);
    if (this.pinned.todos.length > 0) parts.push(`Todos:\n${this.pinned.todos.map((t) => `- ${t}`).join("\n")}`);
    return parts.join("\n\n");
  }

  // --- Broadcast helpers ---

  private broadcastChat(user: string, text: string) {
    const entry: ChatEntry = { user, text, ts: Date.now() };
    this.history.push(entry);
    if (this.history.length > MAX_HISTORY) {
      this.history.splice(0, this.history.length - MAX_HISTORY);
    }
    this.maybeFlushHistory();
    this.broadcast({ type: "chat", ...entry });
  }

  private broadcastSystem(text: string) {
    this.broadcast({ type: "chat", user: "System", text, ts: Date.now() });
  }

  // --- Connection lifecycle ---

  private cleanup(ws: WebSocket) {
    this.connIds.delete(ws);
    this.clientIds.delete(ws);
    this.lastSeen.delete(ws);
    try {
      ws.close(1011, "cleanup");
    } catch {
      // already closed
    }
  }

  private async ensureHeartbeatAlarm() {
    if (this.heartbeatAlarm) return;
    const existing = await this.ctx.storage.getAlarm();
    if (!existing) {
      await this.ctx.storage.setAlarm(Date.now() + HEARTBEAT_INTERVAL_MS);
    }
    this.heartbeatAlarm = true;
  }

  private getOpenSockets(): WebSocket[] {
    return this.ctx.getWebSockets().filter((ws) => ws.readyState === WebSocket.READY_STATE_OPEN);
  }

  private broadcast(obj: Record<string, unknown>) {
    const data = JSON.stringify(obj);
    for (const ws of this.getOpenSockets()) {
      ws.send(data);
    }
  }

  private broadcastPresence() {
    const sockets = this.getOpenSockets();
    const ids = sockets.map((ws) => this.connIds.get(ws) ?? "?");
    console.log(`[room] presence count=${sockets.length} ids=[${ids.join(",")}]`);
    const data = JSON.stringify({ type: "presence", count: sockets.length });
    for (const ws of sockets) {
      ws.send(data);
    }
  }
}

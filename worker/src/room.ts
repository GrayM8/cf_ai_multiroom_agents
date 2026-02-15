import { DurableObject } from "cloudflare:workers";

const HEARTBEAT_INTERVAL_MS = 30_000;
const STALE_TIMEOUT_MS = 45_000;

let nextConnId = 1;

export class Room extends DurableObject {
  private connIds = new Map<WebSocket, string>();
  private lastSeen = new Map<WebSocket, number>();
  private heartbeatAlarm = false;

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 400 });
    }

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

    let msg: { type?: string; user?: string; text?: string };
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

    if (msg.type !== "chat") return;
    if (typeof msg.user !== "string" || msg.user.length === 0 || msg.user.length > 64) return;
    if (typeof msg.text !== "string" || msg.text.length === 0 || msg.text.length > 2000) return;

    const connId = this.connIds.get(ws) ?? "?";
    console.log(`[room] msg from ${connId}: ${msg.text.slice(0, 40)}`);

    this.broadcast({
      type: "chat",
      user: msg.user,
      text: msg.text,
      ts: Date.now(),
    });
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

  private cleanup(ws: WebSocket) {
    this.connIds.delete(ws);
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

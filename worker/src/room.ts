import { DurableObject } from "cloudflare:workers";

// Room Durable Object — stub only. WebSocket handling and room state go here later.
export class Room extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    return new Response("Room stub", { status: 200 });
  }
}

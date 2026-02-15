export { Room } from "./room";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return new Response("EdgeRooms worker is running.", { status: 200 });
  },
} satisfies ExportedHandler<Env>;

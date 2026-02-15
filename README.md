# EdgeRooms

Multi-user real-time rooms with a shared AI host and shared room memory.

## Architecture

```
┌─────────────┐   WebSocket    ┌──────────────────────────────────┐
│  web/       │ ◄────────────► │  worker/                         │
│  Vite+React │                │  Cloudflare Worker               │
│  on Pages   │                │  ├─ Durable Objects (per-room)   │
└─────────────┘                │  └─ Workers AI (LLM responses)   │
                               └──────────────────────────────────┘
```

- **`web/`** — React SPA deployed to Cloudflare Pages via Git integration
- **`worker/`** — Cloudflare Worker with Durable Objects, deployed via `wrangler deploy`

## Local Development

```bash
npm install                  # install all workspace deps
npm run dev                  # start both worker + web concurrently
npm run dev:worker           # worker only (wrangler dev on :8787)
npm run dev:web              # web only (vite on :5173)
```

## Deployment

- **Web (Pages):** auto-deploys from `main` via Cloudflare Pages Git integration
  - Build command: `npm run build --workspace=web`
  - Output directory: `web/dist`
- **Worker:** manual for now
  ```bash
  npm run deploy:worker       # runs wrangler deploy in worker/
  ```

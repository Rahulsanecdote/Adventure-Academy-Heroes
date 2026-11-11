# Multiplayer (Phase 2) — architecture & runbook

KidQuest Phase 2 adds real multiplayer on top of the Phase 1 single-player
slice. Multiplayer is **additive**: if the game server is unreachable, the
game continues in single-player mode exactly as Phase 1 (an "Offline mode"
banner shows in the HUD).

## Components

```
Browser (React + Babylon)          FastAPI (existing)         Colyseus (new)
─────────────────────────          ──────────────────         ──────────────
HubWorld / GameEngine    ──HTTP──▶ POST /api/multiplayer/session-token
MultiplayerClient        ◀─ token ─ (parent JWT required)
        │                                                        ▲
        └────────── WebSocket (game token in join options) ──────┘
                                                         WorldRoom(s)
        Boss defeated ── game server ──HTTP + shared secret──▶ POST
        /api/multiplayer/boss-reward ── awards via utils/rewards.py
```

- **`game-server/`** (Node + TypeScript + Colyseus): the `WorldRoom`.
  One room instance per (world, age band, party code); max 16 players.
  Worlds: `hub`, `math_jungle`. Age bands: `7-9`, `10-12` (the backend maps
  profile bands 7-8 / 9-10 / 11-12 onto these when issuing tokens).
- **FastAPI stays the authority** for identity and progression. It issues
  game tokens and awards all XP/coins. The game server holds only ephemeral
  presence/fight state.

## Token flow

1. Parent is logged in as usual (parent JWT in the browser).
2. On game entry the client calls `POST /api/multiplayer/session-token`
   with the child id. FastAPI verifies the child belongs to that parent and
   returns a **15-minute HS256 token** (same `SECRET_KEY` / algorithm as
   parent auth) with claims `{type: "game", child_id, display_name,
   age_band, avatar}`.
3. The client joins a room presenting the token. Colyseus `onAuth` verifies
   it (`GAME_JWT_SECRET` must equal the backend `SECRET_KEY`). Invalid or
   expired → rejected. No token, no room.
4. Age-band segregation is enforced at join from the **token claim**: the
   first player's claim fixes the room's band; later joiners with a
   different band are refused.
5. World switches (walking through the hub portal) leave the current room
   and join the new world's room, fetching a fresh token.

Party play: add `?party=CODE` to the game URL — everyone using the same
code (and band/world) lands in the same private instance. No code → public
instance for that world + band.

## Server-side validation

- **Movement**: ~10 Hz client updates; the server clamps implied speed
  (max 12 u/s with slack — teleports are pulled back), clamps positions to
  the world bounds, and whitelists animation states (`idle|walk|jump`).
- **Names/avatars** come from the signed token, sanitized server-side
  (length/field allowlists) — clients cannot impersonate via join options.
- **Phrase chat**: fixed phrases only. The canonical list is
  `frontend/src/game/net/phrases.json` — the client bundles it for labels,
  the server loads the same file to validate IDs (`PHRASES_PATH` overrides
  the location; the Docker image copies the file in). Clients send phrase
  IDs only; unknown IDs and >1-per-2s sends are rejected. **There is no
  free-text or voice surface.**
- **Co-op boss** (Math Jungle): any player starts the fight at the boss
  panel; each player receives their own questions (server-generated;
  operand ranges **mirror** `backend/app/utils/math_challenge.py` in
  `game-server/src/math.ts` — the Python file is the reference). Correct =
  1 damage to the shared 10-HP boss; wrong = no damage, next question. On
  defeat the server broadcasts the victory and calls
  `POST /api/multiplayer/boss-reward` with the `X-Internal-Secret` header
  (`MULTIPLAYER_INTERNAL_SECRET`, set identically on both services);
  FastAPI awards each participant +30 XP / +15 coins through
  `app.utils.rewards`. If the bridge is unconfigured, the call is skipped —
  the victory is bragging-rights only.

## Environment variables

Backend (see `backend/.env.example`): `SECRET_KEY`,
`MULTIPLAYER_INTERNAL_SECRET`.

Game server (see `game-server/.env.example`): `PORT`,
`GAME_JWT_SECRET` (= backend `SECRET_KEY`), `FASTAPI_URL`,
`MULTIPLAYER_INTERNAL_SECRET`, `PHRASES_PATH`.

Frontend (see `frontend/.env.example`): `VITE_GAME_SERVER_URL`
(default `ws://localhost:2567`).

## Try it locally (three terminals)

```bash
# 1 — backend (needs MongoDB + env per backend/.env.example)
cd backend && pip install -r requirements.txt && uvicorn app.main:app --port 8001

# 2 — game server (GAME_JWT_SECRET must match the backend SECRET_KEY)
cd game-server && npm install && npm run build && npm start

# 3 — frontend
cd frontend && npm install && npm run dev
```

Log in, pick a child, enter the game. Open a **second browser profile**,
log in (a second child — same or another parent account), and enter the
same world: you should see each other's avatars with name labels. Walk into
the Math Jungle portal in both, open the Jungle Boss panel, and start the
fight in one — both players get questions and share the boss HP bar.

Automated checks: `cd game-server && npm run smoke` boots the server and
runs a two-client protocol test (presence, movement, teleport clamp, phrase
validation, full boss fight, invalid/expired token rejection).

## Deployment — DECISION PENDING (Rahul)

Nothing is deployed yet. The game server is a plain long-lived Node
process (stateful WebSockets — it does **not** fit the FastAPI
single-port/Vercel shape). Options, any Node host works:

- **Render** (web service from `game-server/Dockerfile`) — simplest if the
  stack is already there.
- **Fly.io** — good WebSocket story, cheap small machines, regions near users.
- **Railway** — one-click from the repo, Dockerfile-aware.

Whichever host: set the env vars above, point `VITE_GAME_SERVER_URL` at the
`wss://` URL, and rebuild the frontend. A health endpoint is at `/health`.

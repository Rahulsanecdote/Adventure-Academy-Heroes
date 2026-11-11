# KidQuest Game Server

Colyseus multiplayer server for KidQuest Academy (Phase 2): shared world
rooms, presence, phrase chat, and the co-op Math Jungle boss.

## Run locally

```bash
cd game-server
npm install
npm run build
npm start          # ws://localhost:2567, health at http://localhost:2567/health
```

Smoke test (boots the server, connects two test clients):

```bash
npm run smoke
```

## Environment

| Variable | Required | Meaning |
|---|---|---|
| `PORT` | no (default 2567) | Listen port |
| `GAME_JWT_SECRET` | **yes** | Must exactly match the FastAPI backend's `SECRET_KEY`. Game tokens are HS256 JWTs issued by FastAPI and verified in `onAuth` — no token, no room. |
| `FASTAPI_URL` | for rewards | Base URL of the FastAPI backend |
| `MULTIPLAYER_INTERNAL_SECRET` | for rewards | Shared secret for the boss-reward bridge; must match the backend's value. Unset on either side → boss victories are bragging-rights only. |
| `PHRASES_PATH` | no | Path to the canonical phrase list. Defaults: repo checkout (`frontend/src/game/net/phrases.json`), then `./phrases.json` (Docker). |

See `.env.example`.

## How it fits together

- **Rooms**: one `WorldRoom` per (world, age band, party code). Max 16
  players. Public rooms have an empty party code; a party code joins/creates
  that party's private instance. Worlds: `hub`, `math_jungle`. Age bands:
  `7-9`, `10-12` — enforced from the token claim at join time, not from what
  the client requests.
- **Movement**: clients stream positions at ~10 Hz; the server clamps speed
  (teleport attempts are pulled back to the max allowed distance), bounds
  positions, and whitelists animation states.
- **Phrase chat**: clients send a phrase ID only. IDs are validated against
  the canonical allowlist (`frontend/src/game/net/phrases.json`, the same
  file the client bundles) and rate-limited to 1 per 2 s. **There is no
  free-text path anywhere.**
- **Co-op boss** (Math Jungle rooms): any player starts the fight; each
  player gets their own math questions (difficulty by age band; generation
  mirrors `backend/app/utils/math_challenge.py`); correct answers damage the
  shared boss (10 HP). On defeat the server broadcasts the victory and asks
  FastAPI to award participants via `POST /api/multiplayer/boss-reward`
  (shared-secret header). The game server never writes progression itself.

Full architecture + deployment notes: [`docs/MULTIPLAYER.md`](../docs/MULTIPLAYER.md).

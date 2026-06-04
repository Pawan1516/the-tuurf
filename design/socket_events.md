# Socket.IO Event Contract — TheTurf

Client → Server (emit):

- `verify:qr` — payload: `{ matchId: string, token: string }` — server validates and joins rooms. Response: `match:verified` or `error`.
- `toss:submit` — payload: `{ matchId, winner: string, method: 'heads'|'tails'|'manual' }` → server persists and broadcasts `match:state`.
- `start:match` — payload: `{ matchId, overs: number, strikerId, nonStrikerId, bowlerId }` → server sets match LIVE and broadcasts `match:state`.
- `ball:event` — payload: `BallEvent` (see OpenAPI) → server validates, persists, emits `score:update`, `timeline:append`, `analytics:update`, `ai:commentary`.
- `undo:lastBall` — payload: `{ matchId, reason }` → server attempts undo and emits `score:update` or `undo:rejected`.
- `admin:action` — payload: `{ matchId, action: string, payload?: object }` → server validates admin role and applies change.

Server → Client (broadcasts):

- `match:verified` — `{ matchId, match }`
- `match:state` — `{ matchId, state }` (SCHEDULED/VERIFIED/TOSS/LIVE/INNINGS_BREAK/COMPLETED)
- `score:update` — `{ matchId, inning, score: { runs, wickets }, overs: '16.2', runRate, rrr? }`
- `timeline:append` — `{ matchId, ball }` (append-only)
- `over:complete` — `{ matchId, inning, overNumber }` (prompt next bowler)
- `wicket:prompt` — `{ matchId, wicketInfo }` (server requests new batter)
- `analytics:update` — `{ matchId, analyticsSnapshot }`
- `ai:commentary` — `{ matchId, text, source: 'ai'|'human' }`

Rooms:

- `match:<matchId>` — all viewers and admin
- `scorer:<userId>` — private connection for scorer actions
- `admin:<matchId>` — admin-only events

Notes:

- Use Redis adapter for cross-node pub/sub. Keep payloads small; use IDs and fetch full entities via REST when needed.
- Events are idempotent; each `ball:event` carries a `clientSeq` for reconcilation.

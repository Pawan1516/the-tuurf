# PWA & Offline Scoring Design

Overview:
- Use Service Worker + IndexedDB to capture scoring events when offline.
- Queue events locally (IndexedDB) and flush in order when connectivity restores.
- Use optimistic UI updates; server is authoritative and will reconcile on reconnect.

Key components:
- `IndexedDB` queue: `client/src/utils/indexeddbQueue.js` (enqueue, getAll, remove, flushQueue)
- Service Worker: cache static assets + background sync to attempt flush when online.
- Reconciliation: on reconnect, client asks server for last accepted `clientSeq` and replays pending events.

Conflict resolution:
- Server enforces canonical state and rejects out-of-order events. Client must rebase on server snapshot.

Security:
- Events are signed with scorer session id and short-lived nonce to prevent replay attacks.

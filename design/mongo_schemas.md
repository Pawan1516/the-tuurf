# MongoDB Collection Schemas & Indexes (core)

users
- _id: ObjectId
- name, email, roles: ["scorer","admin","viewer"]
- lastLogin, createdAt
- audit: []

Indexes:
- email (unique)
- roles

tournaments
- _id, name, stages, config

teams
- _id, name, players: [playerId], meta

players
- _id, name, profile, stats

matches
- _id, tournamentId, status, venue, start, end
- qrTokenHash, qrExpires
- toss: { winner, method }
- playingXI: [{ playerId, role }]
- currentInningId

Indexes:
- { status: 1 }
- { tournamentId: 1 }
- { qrTokenHash: 1 }

innings
- _id, matchId, inningNumber, score: { runs, wickets }, overs
- partnerships: [{ fromBallId, runs, batters: [ids] }]

balls
- _id, matchId, inningId, over, ballNumber, runs, extra, wicket, batsmanId, bowlerId, timestamp

Indexes:
- { matchId: 1, inningId: 1, over: 1, ballNumber: 1 }
- { matchId: 1, timestamp: 1 }

scorecards
- snapshot documents for fast reads (denormalized)

commentary
- { matchId, inningId, ballId, text, source }

analytics
- timeseries or pre-aggregated snapshots stored per match

Design notes:
- Use soft deletes: `deletedAt` field
- Keep audit logs in separate `audit_logs` collection for append-only history
- Precompute heavy aggregates during quiet periods or via background workers

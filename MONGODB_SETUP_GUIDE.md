# The Turf - MongoDB Database Setup & Configuration Guide

## Overview
This guide covers setting up and working with MongoDB for The Turf cricket tournament platform. The project has been migrated from PostgreSQL to MongoDB.

---

## 1. Quick Start with Docker

### Start All Services
```bash
# Navigate to project root
cd /path/to/the-turf

# Start MongoDB and Redis
docker-compose up -d

# Verify services
docker-compose ps
```

### Access MongoDB

**Option A: MongoDB Express (Web UI)**
```
URL: http://localhost:8081
Username: admin
Password: admin123
```

**Option B: MongoDB CLI**
```bash
# Access MongoDB shell
docker exec -it the_turf_db mongosh

# Authenticate
use admin
db.auth("turf_user", "turf_secure_password_123")

# Switch to the_turf database
use the_turf

# View collections
db.getCollectionNames()

# Check user privileges
db.getUser("turf_user")
```

**Option C: Prisma Studio**
```bash
# Open Prisma's interactive database viewer
npx prisma studio

# Opens at http://localhost:5555
```

---

## 2. MongoDB Connection Strings

### Docker (Recommended for Development)
```
mongodb://turf_user:turf_secure_password_123@localhost:27017/the_turf?authSource=admin
```

### Local Installation
```
mongodb://localhost:27017/the_turf
```

### MongoDB Atlas (Cloud)
```
mongodb+srv://username:password@cluster-name.mongodb.net/the_turf?retryWrites=true&w=majority
```

### Connection in .env
```env
DATABASE_URL="mongodb://turf_user:turf_secure_password_123@localhost:27017/the_turf?authSource=admin"
```

---

## 3. Prisma with MongoDB

### Generate Prisma Client
```bash
npx prisma generate
```

### Initialize Database with Collections
```bash
# The init-mongo.js script creates:
# - Collections with validation schemas
# - Indexes for performance
# - User roles and permissions
docker exec -it the_turf_db mongosh --username turf_user --password turf_secure_password_123 --authenticationDatabase admin the_turf < init-mongo.js
```

### View Database Schema
```bash
# Open Prisma Studio
npx prisma studio

# View all models and their fields
# Create, read, update, delete records
# Export data
```

---

## 4. MongoDB Collections

### Created Collections

| Collection | Purpose | Key Fields |
|-----------|---------|-----------|
| users | User accounts & profiles | email, phone, role |
| tournaments | Cricket tournaments | name, type, status |
| teams | Cricket teams | name, captainId |
| players | Player profiles | userId, teamId |
| matches | Individual matches | teamAId, teamBId, status |
| sessions | Active user sessions | userId, expiresAt |
| fixtures | Match schedules | tournamentId, matchNumber |
| innings | Match innings | matchId, inningsNumber |
| overs | Cricket overs | inningsId, overNumber |
| balls | Ball-by-ball data | overId, ballNumber |
| leaderboards | Player rankings | tournamentId, playerId |
| pointstable | Team standings | tournamentId, teamId |
| awards | Tournament awards | tournamentId, awardType |
| payments | Payment records | userId, status |
| notifications | User notifications | userId, type |
| teamplayers | Team-Player junction | teamId, playerId |
| tournamentteams | Tournament-Team junction | tournamentId, teamId |
| statistics | Aggregated stats | playerId, teamId |

---

## 5. Key Indexes

MongoDB automatically creates indexes based on Prisma schema. Key indexes include:

```javascript
// User indexes
db.users.getIndexes()
// Output:
// _id_ (primary)
// email_1 (unique)
// phone_1 (unique)
// role_1

// Tournament indexes
db.tournaments.getIndexes()
// _id_
// status_1
// startDate_1

// Match indexes
db.matches.getIndexes()
// _id_
// fixtureId_1 (unique)
// teamAId_1
// teamBId_1
// status_1
```

---

## 6. Data Types in MongoDB

### Prisma Type → MongoDB Type Mapping

| Prisma Type | MongoDB Type | Notes |
|------------|------------|--------|
| String | String | |
| Int | Int32, Int64 | |
| Float | Double | |
| Boolean | Boolean | |
| DateTime | Date | ISO 8601 format |
| Bytes | BinData | Binary data |
| Json | Object | Flexible structure |
| Decimal | Decimal128 | For financial data |
| BigInt | Int64 | Large integers |

### Example Document

```json
{
  "_id": "cly5h8k9v0001qz8e8e8e8e8e",
  "email": "player@theturf.com",
  "phone": "9876543210",
  "name": "John Player",
  "password": "$2b$10$...",
  "role": "PLAYER",
  "profileImage": "https://...",
  "profileBio": "Amateur cricket player",
  "isVerified": true,
  "isActive": true,
  "lastLogin": "2024-06-08T18:50:07.945Z",
  "createdAt": "2024-06-01T10:00:00.000Z",
  "updatedAt": "2024-06-08T18:50:07.945Z"
}
```

---

## 7. Querying Data with Prisma

### Basic CRUD Operations

```javascript
const prisma = require('@prisma/client').PrismaClient;

// CREATE
const user = await prisma.user.create({
  data: {
    email: 'player@theturf.com',
    phone: '9876543210',
    name: 'John Player',
    password: 'hashed_password',
    role: 'PLAYER',
  },
});

// READ
const user = await prisma.user.findUnique({
  where: { email: 'player@theturf.com' },
});

// UPDATE
const updated = await prisma.user.update({
  where: { id: 'user_id' },
  data: { isActive: true },
});

// DELETE
await prisma.user.delete({
  where: { id: 'user_id' },
});

// LIST with pagination
const users = await prisma.user.findMany({
  where: { role: 'PLAYER' },
  skip: (page - 1) * limit,
  take: limit,
  orderBy: { createdAt: 'desc' },
});
```

### Advanced Queries

```javascript
// Include related data
const user = await prisma.user.findUnique({
  where: { id: 'user_id' },
  include: {
    captainTeams: true,
    playerProfile: true,
    sessions: true,
    payments: true,
  },
});

// Filter with conditions
const activeUsers = await prisma.user.findMany({
  where: {
    isActive: true,
    role: { in: ['PLAYER', 'SCORER'] },
    createdAt: {
      gte: new Date('2024-01-01'),
    },
  },
});

// Count records
const count = await prisma.user.count({
  where: { role: 'PLAYER' },
});

// Aggregation
const stats = await prisma.player.aggregate({
  _avg: { totalRuns: true },
  _max: { totalRuns: true },
  _min: { totalRuns: true },
  where: { totalMatches: { gte: 5 } },
});
```

---

## 8. Transactions in MongoDB

```javascript
const prisma = require('@prisma/client').PrismaClient;

// Multi-step transaction
const result = await prisma.$transaction(async (tx) => {
  // Create tournament
  const tournament = await tx.tournament.create({
    data: {
      name: 'Summer Cricket League',
      type: 'LEAGUE',
      format: 'T20',
    },
  });

  // Register teams
  const team1 = await tx.team.create({
    data: {
      name: 'Team A',
      city: 'Delhi',
      captainId: 'captain_id',
    },
  });

  // Add to tournament
  const registration = await tx.tournamentTeam.create({
    data: {
      tournamentId: tournament.id,
      teamId: team1.id,
      status: 'REGISTERED',
    },
  });

  return { tournament, team1, registration };
});
```

---

## 9. Performance Optimization

### Query Optimization Tips

1. **Use `select` to fetch only needed fields**
```javascript
const users = await prisma.user.findMany({
  select: { id: true, email: true, name: true }, // Not the password!
});
```

2. **Use pagination for large datasets**
```javascript
const page = 1;
const limit = 20;
const users = await prisma.user.findMany({
  skip: (page - 1) * limit,
  take: limit,
});
```

3. **Create indexes for frequently queried fields**
- Already defined in Prisma schema
- Check with: `db.collection_name.getIndexes()`

4. **Use `include` and `select` wisely**
```javascript
// ✅ Good - only needed relations
const users = await prisma.user.findMany({
  include: { sessions: { select: { id: true, expiresAt: true } } },
});

// ❌ Bad - includes all data
const users = await prisma.user.findMany({
  include: { sessions: true }, // All session fields
});
```

### MongoDB Indexing

```bash
# View indexes for a collection
db.users.getIndexes()

# Create custom index
db.users.createIndex({ email: 1, role: 1 })

# Create text index for search
db.users.createIndex({ name: "text", profileBio: "text" })

# Drop index
db.users.dropIndex("email_1_role_1")
```

---

## 10. Backing Up MongoDB Data

### Backup with Docker

```bash
# Create backup
docker exec the_turf_db mongodump --username turf_user --password turf_secure_password_123 --authenticationDatabase admin --db the_turf --archive=/data/backup.archive

# Restore from backup
docker exec the_turf_db mongorestore --username turf_user --password turf_secure_password_123 --authenticationDatabase admin --archive=/data/backup.archive
```

### Manual Backup

```bash
# Export collection as JSON
mongosh the_turf --eval "db.users.find({}).forEach(doc => print(EJSON.stringify(doc)))" > users_backup.json

# Import collection from JSON
mongoimport --db the_turf --collection users --file users_backup.json
```

---

## 11. Troubleshooting

### Connection Issues

```bash
# Check if MongoDB is running
docker logs the_turf_db

# Test connection
docker exec -it the_turf_db mongosh

# Check connection in Node
node -e "require('@prisma/client').PrismaClient().$connect().then(() => console.log('Connected'))"
```

### Authentication Issues

```bash
# Reset user password
db.updateUser("turf_user", {
  pwd: passwordPrompt(),
  mechanisms: ["SCRAM-SHA-1"]
})

# Or run full authentication
docker exec -it the_turf_db mongosh --username turf_user --password turf_secure_password_123 --authenticationDatabase admin
```

### Data Issues

```bash
# Clear all collections (CAREFUL!)
db.dropDatabase()

# Drop specific collection
db.users.drop()

# View disk usage
db.stats()
```

---

## 12. MongoDB vs PostgreSQL (Prisma)

### Key Differences

| Feature | MongoDB | PostgreSQL |
|---------|---------|-----------|
| Data Model | Document (JSON) | Relational (Tables) |
| Scaling | Horizontal (Sharding) | Vertical (Replication) |
| Transactions | Multi-doc transactions | ACID transactions |
| Schema | Flexible | Strict |
| Joins | Embedded docs/ lookup | SQL joins |
| Query Language | MongoDB Query Language | SQL |

### Migration Notes

- Prisma handles differences transparently
- No need to change Node.js code
- All CRUD operations work the same way
- Removed `@db.Text` annotations (not supported in MongoDB)
- Added `@map("_id")` for consistent ID mapping

---

## 13. Resources

- **MongoDB Docs**: https://docs.mongodb.com/
- **Prisma MongoDB**: https://www.prisma.io/docs/orm/overview/databases/mongodb
- **MongoDB Atlas**: https://www.mongodb.com/cloud/atlas
- **Prisma Schema**: https://www.prisma.io/docs/orm/prisma-schema

---

## Summary

✅ **MongoDB Setup Complete**

- Docker Compose configured with MongoDB + Redis
- Prisma schema updated for MongoDB
- Collections created with validation and indexes
- Connection string configured
- Development tools available (Prisma Studio, MongoDB Express)

**Next Steps:**
1. Start services: `docker-compose up -d`
2. Verify connection: `npx prisma studio`
3. Begin Week 2: Authentication & User Management APIs

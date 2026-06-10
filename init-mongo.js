// Initialize MongoDB database for The Turf
// This script runs when MongoDB container starts

db.auth('turf_user', 'turf_secure_password_123');

// Switch to the_turf database
db = db.getSiblingDB('the_turf');

// Create collections if they don't exist
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'phone', 'name', 'password'],
      properties: {
        _id: { bsonType: 'objectId' },
        email: { bsonType: 'string' },
        phone: { bsonType: 'string' },
        name: { bsonType: 'string' },
        password: { bsonType: 'string' },
        role: { enum: ['SUPER_ADMIN', 'TOURNAMENT_ADMIN', 'TEAM_CAPTAIN', 'PLAYER', 'SCORER', 'UMPIRE', 'SPECTATOR'] }
      }
    }
  }
});

db.createCollection('tournaments', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'type', 'format'],
      properties: {
        _id: { bsonType: 'objectId' },
        name: { bsonType: 'string' },
        type: { enum: ['LEAGUE', 'KNOCKOUT', 'LEAGUE_KNOCKOUT'] },
        format: { bsonType: 'string' }
      }
    }
  }
});

db.createCollection('teams', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'city', 'captainId'],
      properties: {
        _id: { bsonType: 'objectId' },
        name: { bsonType: 'string' },
        city: { bsonType: 'string' },
        captainId: { bsonType: 'string' }
      }
    }
  }
});

db.createCollection('players', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId'],
      properties: {
        _id: { bsonType: 'objectId' },
        userId: { bsonType: 'string' }
      }
    }
  }
});

db.createCollection('matches', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['fixtureId', 'teamAId', 'teamBId', 'scorerId'],
      properties: {
        _id: { bsonType: 'objectId' },
        fixtureId: { bsonType: 'string' },
        teamAId: { bsonType: 'string' },
        teamBId: { bsonType: 'string' },
        scorerId: { bsonType: 'string' },
        status: { enum: ['SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED', 'POSTPONED'] }
      }
    }
  }
});

// Create indexes for better query performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ phone: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ createdAt: 1 });

db.tournaments.createIndex({ status: 1 });
db.tournaments.createIndex({ startDate: 1 });
db.tournaments.createIndex({ createdAt: 1 });

db.teams.createIndex({ name: 1 }, { unique: true });
db.teams.createIndex({ captainId: 1 });
db.teams.createIndex({ createdAt: 1 });

db.players.createIndex({ userId: 1 }, { unique: true });
db.players.createIndex({ teamId: 1 });

db.matches.createIndex({ fixtureId: 1 }, { unique: true });
db.matches.createIndex({ teamAId: 1 });
db.matches.createIndex({ teamBId: 1 });
db.matches.createIndex({ status: 1 });
db.matches.createIndex({ createdAt: 1 });

// Create audit log collection
db.createCollection('auditlogs');
db.auditlogs.createIndex({ timestamp: 1 });
db.auditlogs.createIndex({ userId: 1 });
db.auditlogs.createIndex({ action: 1 });

console.log('✅ MongoDB initialization complete');

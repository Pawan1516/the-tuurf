import mongoose, { Schema, Document } from 'mongoose';

export interface IMatch extends Document {
  matchId: string;
  matchName: string;
  matchType: 'friendly' | 'league' | 'tournament';
  format: 'T20' | 'T10' | '50-over' | 'custom';
  turfSlotId: Schema.Types.ObjectId;
  venue: {
    name: string;
    location: string;
    coordinates: { lat: number; lng: number };
  };
  createdBy: Schema.Types.ObjectId;
  createdAt: Date;
  matchDate: Date;
  status: 'created' | 'ready' | 'live' | 'completed' | 'cancelled';
  players: Array<{
    userId?: Schema.Types.ObjectId;
    phone: string;
    name: string;
    team: string;
    role: string;
    invitationStatus: 'pending' | 'accepted' | 'declined' | 'expired';
    acceptedAt?: Date;
    battingOrder?: number;
    bowlingOrder?: number;
  }>;
  teams: Array<{
    teamName: string;
    captain: Schema.Types.ObjectId;
    players: Schema.Types.ObjectId[];
  }>;
  rules: {
    overs: number;
    powerplayOvers: number;
    boundaries: { four: number; six: number };
    wicketValue: number;
  };
  score: {
    team1: { runs: number; wickets: number; overs: number };
    team2: { runs: number; wickets: number; overs: number };
  };
  toss?: {
    winner: string;
    decision: 'bat' | 'bowl';
    timestamp: Date;
  };
  winner?: string;
  manOfTheMatch?: Schema.Types.ObjectId;
  updatedAt: Date;
}

const MatchSchema = new Schema<IMatch>(
  {
    matchId: { type: String, unique: true, required: true },
    matchName: { type: String, required: true },
    matchType: { 
      type: String, 
      enum: ['friendly', 'league', 'tournament'],
      default: 'friendly'
    },
    format: { 
      type: String, 
      enum: ['T20', 'T10', '50-over', 'custom'],
      default: 'T20'
    },
    turfSlotId: { type: Schema.Types.ObjectId, ref: 'Booking' },
    venue: {
      name: String,
      location: String,
      coordinates: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point'
        },
        coordinates: [Number]
      }
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    matchDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['created', 'ready', 'live', 'completed', 'cancelled'],
      default: 'created'
    },
    players: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        phone: String,
        name: String,
        team: String,
        role: String,
        invitationStatus: {
          type: String,
          enum: ['pending', 'accepted', 'declined', 'expired'],
          default: 'pending'
        },
        acceptedAt: Date,
        battingOrder: Number,
        bowlingOrder: Number
      }
    ],
    teams: [
      {
        teamName: String,
        captain: { type: Schema.Types.ObjectId, ref: 'User' },
        players: [{ type: Schema.Types.ObjectId, ref: 'User' }]
      }
    ],
    rules: {
      overs: { type: Number, default: 20 },
      powerplayOvers: { type: Number, default: 6 },
      boundaries: {
        four: { type: Number, default: 4 },
        six: { type: Number, default: 6 }
      },
      wicketValue: { type: Number, default: 1 }
    },
    score: {
      team1: { runs: Number, wickets: Number, overs: Number },
      team2: { runs: Number, wickets: Number, overs: Number }
    },
    toss: {
      winner: String,
      decision: { type: String, enum: ['bat', 'bowl'] },
      timestamp: Date
    },
    winner: String,
    manOfTheMatch: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

// Indexes
MatchSchema.index({ matchDate: -1 });
MatchSchema.index({ status: 1 });
MatchSchema.index({ createdBy: 1 });
MatchSchema.index({ 'teams.players': 1 });

export default mongoose.model<IMatch>('Match', MatchSchema);

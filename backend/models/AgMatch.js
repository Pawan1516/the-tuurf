const mongoose = require('mongoose');

const agMatchSchema = new mongoose.Schema({
  matchId: { type: String, required: true, unique: true },
  name: { type: String },
  maxOvers: { type: Number, default: 20 },
  ppOvers: { type: Number, default: 2 },
  
  teamA: {
    name: { type: String, required: true },
    players: [{
      name: String,
      mobile: String,
      role: { type: String, enum: ['Batsman', 'Bowler', 'All-rounder'], default: 'Batsman' }
    }]
  },
  teamB: {
    name: { type: String, required: true },
    players: [{
      name: String,
      mobile: String,
      role: { type: String, enum: ['Batsman', 'Bowler', 'All-rounder'], default: 'Batsman' }
    }]
  },
  
  adminPin: { type: String, required: true },
  token: { type: String, required: true },
  
  status: { 
    type: String, 
    enum: ['CREATED', 'LOCKED', 'UNLOCKED', 'TOSS_DONE', 'IN_PROGRESS', 'INNINGS_BREAK', 'COMPLETED'],
    default: 'CREATED'
  },
  
  toss: {
    winner: { type: String, enum: ['teamA', 'teamB', null], default: null },
    decision: { type: String, enum: ['Bat', 'Bowl', null], default: null }
  },
  
  battingTeam: { type: String, enum: ['teamA', 'teamB', null], default: null },
  bowlingTeam: { type: String, enum: ['teamA', 'teamB', null], default: null },
  
  innings: [{
    number: { type: Number, enum: [1, 2] },
    battingTeam: String,
    bowlingTeam: String,
    score: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    overs: { type: Number, default: 0 }, // fractional overs e.g. 1.2
    target: { type: Number, default: 0 },
    
    batters: [{
      id: String, // mobile or custom id
      name: String,
      runs: { type: Number, default: 0 },
      balls: { type: Number, default: 0 },
      fours: { type: Number, default: 0 },
      sixes: { type: Number, default: 0 },
      dismissal: { type: String, default: 'Not Out' },
      isStriker: { type: Boolean, default: false },
      isNonStriker: { type: Boolean, default: false }
    }],
    
    bowlers: [{
      id: String,
      name: String,
      overs: { type: Number, default: 0 },
      runs: { type: Number, default: 0 },
      wickets: { type: Number, default: 0 },
      maidens: { type: Number, default: 0 },
      dots: { type: Number, default: 0 },
      isBowling: { type: Boolean, default: false }
    }],
    
    extras: {
      wides: { type: Number, default: 0 },
      noBalls: { type: Number, default: 0 },
      total: { type: Number, default: 0 }
    },
    
    fow: [{
      runs: Number,
      player: String,
      how: String,
      over: String
    }]
  }],
  
  result: {
    winner: String, // team name
    margin: String // 'X runs' or 'Y wickets'
  }
}, { timestamps: true });

module.exports = mongoose.model('AgMatch', agMatchSchema);

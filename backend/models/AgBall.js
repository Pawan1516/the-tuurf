const mongoose = require('mongoose');

const agBallSchema = new mongoose.Schema({
  matchId: { type: String, required: true },
  inningsNum: { type: Number, required: true },
  overNum: { type: Number, required: true },
  ballNum: { type: Number, required: true }, // absolute ball in over (1 to 6+)
  
  type: { type: String, enum: ['run', 'wicket', 'extra'], required: true },
  runs: { type: Number, default: 0 }, // runs off the bat
  
  extra: { type: String, enum: ['wide', 'nb', null], default: null },
  
  freeHit: { type: Boolean, default: false },
  
  dismissal: { type: String, default: null }, // 'Bowled', 'Caught', 'Run out', etc.
  fielder: { type: String, default: null },
  
  batsman: { type: String, required: true },
  bowler: { type: String, required: true },
  
  commentary: { type: String },
  
}, { timestamps: true });

agBallSchema.index({ matchId: 1, inningsNum: 1, overNum: 1, ballNum: 1 });

module.exports = mongoose.model('AgBall', agBallSchema);

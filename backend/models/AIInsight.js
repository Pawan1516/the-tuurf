const mongoose = require('mongoose');

const aiInsightSchema = new mongoose.Schema({
  match_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true },
  innings: { type: Number, enum: [1, 2], default: 1 },
  over: { type: Number, default: 0 },
  ball: { type: Number, default: 0 },
  type: { type: String, enum: ['win_probability', 'commentary', 'prediction', 'momentum', 'player_rating', 'highlight'], required: true },
  title: { type: String },
  content: { type: String, required: true },
  confidence: { type: Number, default: null },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

aiInsightSchema.index({ match_id: 1, innings: 1, over: 1, ball: 1 });

const AIInsight = mongoose.model('AIInsight', aiInsightSchema);
module.exports = AIInsight;

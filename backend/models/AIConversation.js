'use strict';
const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  role:      { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content:   { type: String, required: true },
  intent:    { type: String, default: null },
  sentiment: { type: Number, default: null }, // -1 to 1
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const AIConversationSchema = new mongoose.Schema({
  userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  sessionId:        { type: String, index: true },
  channel:          { type: String, enum: ['web', 'whatsapp', 'voice', 'email', 'sms', 'telegram', 'api'], default: 'web' },
  agentType:        { type: String, default: 'customer_support' },
  messages:         [MessageSchema],
  intent:           String,
  resolution:       { type: String, enum: ['resolved', 'escalated', 'abandoned', 'pending'], default: 'pending' },
  sentiment:        { type: Number, default: null },
  handedOffToHuman: { type: Boolean, default: false },
  isLead:           { type: Boolean, default: false },
  leadNotes:        String,
  leadAt:           Date,
  duration:         Number, // seconds
  csat:             { type: Number, min: 1, max: 5 }, // customer satisfaction score
  metadata:         { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

AIConversationSchema.index({ createdAt: -1 });
AIConversationSchema.index({ channel: 1, resolution: 1 });

module.exports = mongoose.model('AIConversation', AIConversationSchema);

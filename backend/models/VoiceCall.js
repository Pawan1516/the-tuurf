'use strict';
const mongoose = require('mongoose');

const TranscriptLineSchema = new mongoose.Schema({
  speaker:   { type: String, enum: ['ai', 'human', 'system'], required: true },
  text:      { type: String, required: true },
  timestamp: { type: Number }, // ms offset from call start
  confidence: Number,          // STT confidence 0-1
}, { _id: false });

const VoiceCallSchema = new mongoose.Schema({
  callSid:       { type: String, unique: true, sparse: true },       // Twilio Call SID
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  direction:     { type: String, enum: ['inbound', 'outbound'], required: true },
  fromNumber:    { type: String, required: true },
  toNumber:      { type: String, required: true },
  status:        { type: String, enum: ['initiated', 'ringing', 'in-progress', 'completed', 'failed', 'no-answer', 'busy'], default: 'initiated' },
  
  // Call flow
  currentStage:  { type: String, enum: ['greeting', 'verification', 'intent', 'resolution', 'action', 'summary'], default: 'greeting' },
  verifiedUser:  { type: Boolean, default: false },
  detectedIntent:String,

  // Content
  transcript:    [TranscriptLineSchema],
  aiSummary:     String,
  callOutcome:   String,       // resolved / escalated / callback / no-action
  actionsTaken:  [String],     // list of actions performed during call
  followUpTasks: [String],

  // Metrics
  duration:      Number,       // seconds
  sentiment:     Number,       // -1 to 1
  emotion:       String,       // happy / neutral / frustrated / angry
  csat:          { type: Number, min: 1, max: 5 },

  // Recording
  recordingUrl:  String,
  recordingSid:  String,

  metadata:      { type: mongoose.Schema.Types.Mixed, default: {} },
  startedAt:     Date,
  endedAt:       Date,
}, { timestamps: true });

VoiceCallSchema.index({ createdAt: -1 });
VoiceCallSchema.index({ status: 1 });

module.exports = mongoose.model('VoiceCall', VoiceCallSchema);

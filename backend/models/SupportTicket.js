'use strict';
const mongoose = require('mongoose');

const TicketMessageSchema = new mongoose.Schema({
  sender:    { type: String, enum: ['user', 'agent', 'ai', 'system'] },
  content:   String,
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const SupportTicketSchema = new mongoose.Schema({
  ticketRef:  { type: String, unique: true },         // TKT-XXXXXX
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  channel:    { type: String, enum: ['web', 'whatsapp', 'voice', 'email', 'sms'], default: 'web' },
  type:       { type: String, enum: ['complaint', 'refund', 'account', 'booking', 'payment', 'technical', 'general'], default: 'general' },
  subject:    String,
  message:    { type: String, required: true },
  status:     { type: String, enum: ['open', 'in-progress', 'resolved', 'closed', 'escalated'], default: 'open', index: true },
  priority:   { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  assignedTo: String,                                 // human agent name
  thread:     [TicketMessageSchema],
  aiSummary:  String,
  resolution: String,
  csat:       { type: Number, min: 1, max: 5 },
  resolvedAt: Date,
  slaBreached:{ type: Boolean, default: false },
  tags:       [String],
}, { timestamps: true });

// Auto-generate ticket reference
SupportTicketSchema.pre('save', function(next) {
  if (!this.ticketRef) {
    this.ticketRef = 'TKT-' + Date.now().toString(36).toUpperCase();
  }
  next();
});

SupportTicketSchema.index({ createdAt: -1 });
SupportTicketSchema.index({ status: 1, priority: -1 });

module.exports = mongoose.model('SupportTicket', SupportTicketSchema);

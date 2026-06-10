'use strict';
const mongoose = require('mongoose');

const StepLogSchema = new mongoose.Schema({
  step:      String,
  status:    { type: String, enum: ['pending', 'running', 'success', 'failed', 'skipped'] },
  output:    mongoose.Schema.Types.Mixed,
  error:     String,
  duration:  Number, // ms
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const WorkflowExecutionSchema = new mongoose.Schema({
  workflowId:   { type: String, required: true, index: true },
  workflowName: String,
  triggeredBy:  { type: String, enum: ['manual', 'schedule', 'event', 'api'], default: 'manual' },
  triggerData:  mongoose.Schema.Types.Mixed,
  status:       { type: String, enum: ['pending', 'running', 'completed', 'failed', 'cancelled'], default: 'pending' },
  steps:        [StepLogSchema],
  output:       mongoose.Schema.Types.Mixed,
  error:        String,
  duration:     Number, // ms total
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

WorkflowExecutionSchema.index({ createdAt: -1 });
WorkflowExecutionSchema.index({ status: 1 });

module.exports = mongoose.model('WorkflowExecution', WorkflowExecutionSchema);

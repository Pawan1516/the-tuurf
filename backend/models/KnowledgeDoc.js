'use strict';
const mongoose = require('mongoose');

const KnowledgeDocSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  content:     { type: String, required: true },   // full text
  summary:     String,
  category:    { type: String, enum: ['faq', 'policy', 'sop', 'product', 'training', 'general'], default: 'general' },
  tags:        [String],
  source:      String,                              // filename or URL
  mimeType:    String,
  embeddings:  [Number],                            // vector embedding
  chunkIndex:  { type: Number, default: 0 },        // for multi-chunk docs
  parentDoc:   { type: mongoose.Schema.Types.ObjectId, ref: 'KnowledgeDoc' },
  isActive:    { type: Boolean, default: true },
  uploadedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  usageCount:  { type: Number, default: 0 },        // how many times retrieved
}, { timestamps: true });

KnowledgeDocSchema.index({ category: 1, isActive: 1 });
KnowledgeDocSchema.index({ tags: 1 });
KnowledgeDocSchema.index({ title: 'text', content: 'text', tags: 'text' }); // full-text search

module.exports = mongoose.model('KnowledgeDoc', KnowledgeDocSchema);

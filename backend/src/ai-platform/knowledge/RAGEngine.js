'use strict';
/**
 * ─── RAG ENGINE ──────────────────────────────────────────────────────────────
 * Retrieval-Augmented Generation: retrieves context from knowledge base
 * and augments LLM prompts for grounded, accurate responses.
 */

const { semanticSearch } = require('./KnowledgeBase');

let openaiClient = null;
function setClient(client) { openaiClient = client; }

const SYSTEM_PROMPT = `You are a knowledgeable assistant for "The Turf" sports platform.
Answer questions based ONLY on the provided context documents.
If the answer is not in the context, say: "I don't have specific information about that, but here's what I can tell you..."
Always be helpful, concise, and accurate. Cite which document you're referencing when possible.`;

/**
 * Run RAG pipeline: retrieve → augment → generate
 * @param {string} query        — user's question
 * @param {object} options
 * @param {string} options.channel
 * @param {object} options.conversationHistory — prior messages
 * @returns {Promise<{ answer: string, sources: Array, confidence: number }>}
 */
async function ragQuery(query, options = {}) {
  const { conversationHistory = [], topK = 3, category = null } = options;

  // 1. Retrieve relevant documents
  const docs = await semanticSearch(query, { topK, category });

  if (docs.length === 0) {
    return {
      answer: "I couldn't find specific information about that in my knowledge base. Please contact our support team for assistance.",
      sources: [],
      confidence: 0.1,
      usedRAG: false,
    };
  }

  // 2. Build context block
  const contextBlock = docs
    .map((doc, i) => `[Document ${i + 1}: ${doc.title}]\n${doc.content.slice(0, 800)}`)
    .join('\n\n---\n\n');

  // 3. Generate augmented response
  if (!openaiClient) {
    // No LLM — return best matching document directly
    const bestDoc = docs[0];
    return {
      answer: `Based on our knowledge base: ${bestDoc.content.slice(0, 500)}...`,
      sources: docs.map(d => ({ title: d.title, category: d.category, similarity: d.similarity })),
      confidence: bestDoc.similarity || 0.5,
      usedRAG: true,
    };
  }

  try {
    const messages = [
      { role: 'system', content: `${SYSTEM_PROMPT}\n\nContext Documents:\n${contextBlock}` },
      ...conversationHistory.slice(-4).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: query },
    ];

    const res = await openaiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 500,
      temperature: 0.3,
    });

    const answer     = res.choices[0].message.content;
    const avgSim     = docs.reduce((s, d) => s + (d.similarity || 0), 0) / docs.length;
    const confidence = Math.min(0.95, avgSim * 1.1);

    // Track usage
    incrementUsage(docs.map(d => d._id));

    return {
      answer,
      sources: docs.map(d => ({ title: d.title, category: d.category, similarity: d.similarity?.toFixed(3) })),
      confidence,
      usedRAG: true,
    };
  } catch (err) {
    console.error('[RAGEngine] Generation error:', err.message);
    // Degrade gracefully — return top document excerpt
    return {
      answer: `Here's what I found: ${docs[0].content.slice(0, 400)}...`,
      sources: docs.map(d => ({ title: d.title, category: d.category })),
      confidence: 0.4,
      usedRAG: true,
      degraded: true,
    };
  }
}

async function incrementUsage(docIds) {
  try {
    const mongoose    = require('mongoose');
    const KnowledgeDoc = mongoose.model('KnowledgeDoc');
    await KnowledgeDoc.updateMany(
      { _id: { $in: docIds } },
      { $inc: { usageCount: 1 } }
    );
  } catch { /* non-critical */ }
}

module.exports = { ragQuery, setClient };

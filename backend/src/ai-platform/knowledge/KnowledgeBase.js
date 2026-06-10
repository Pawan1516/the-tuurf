'use strict';
/**
 * ─── KNOWLEDGE BASE ENGINE ───────────────────────────────────────────────────
 * Document ingestion, embedding, and semantic search with RAG support
 */

const mongoose = require('mongoose');
const fs       = require('fs');
const path     = require('path');

let openaiClient = null;
function setClient(client) { openaiClient = client; }

// ─── Document Parsing ─────────────────────────────────────────────────────────

async function parseDocument(filePath, mimeType) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.txt' || ext === '.md') {
    return fs.readFileSync(filePath, 'utf8');
  }

  if (ext === '.pdf') {
    try {
      const pdfParse = require('pdf-parse');
      const buffer   = fs.readFileSync(filePath);
      const data     = await pdfParse(buffer);
      return data.text;
    } catch (err) {
      throw new Error(`PDF parse failed: ${err.message}`);
    }
  }

  if (ext === '.docx') {
    try {
      const mammoth = require('mammoth');
      const result  = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } catch (err) {
      throw new Error(`DOCX parse failed: ${err.message}`);
    }
  }

  throw new Error(`Unsupported file type: ${ext}`);
}

// ─── Chunking ─────────────────────────────────────────────────────────────────

function chunkText(text, chunkSize = 1000, overlap = 100) {
  const chunks = [];
  let start    = 0;

  while (start < text.length) {
    const end   = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 50) chunks.push(chunk); // skip tiny chunks
    start = end - overlap;
    if (start >= text.length) break;
  }

  return chunks;
}

// ─── Embedding Generation ─────────────────────────────────────────────────────

async function generateEmbedding(text) {
  if (!openaiClient) {
    // Fallback: return a deterministic mock embedding (for development)
    console.warn('[KnowledgeBase] No OpenAI client — using mock embeddings');
    return Array.from({ length: 1536 }, (_, i) => Math.sin(i + text.length));
  }

  try {
    const res = await openaiClient.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000), // API limit
    });
    return res.data[0].embedding;
  } catch (err) {
    console.error('[KnowledgeBase] Embedding error:', err.message);
    return null;
  }
}

// ─── Cosine Similarity ────────────────────────────────────────────────────────

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

// ─── Document Ingest ──────────────────────────────────────────────────────────

/**
 * Ingest a file into the knowledge base
 * @param {object} options
 * @param {string} options.filePath    — absolute path to file
 * @param {string} options.title       — document title
 * @param {string} options.category    — 'faq'|'policy'|'sop'|'product'|'training'|'general'
 * @param {string[]} options.tags      — tag array
 * @param {string} options.uploadedBy  — user ID
 * @returns {Promise<{ success: boolean, docCount: number, docIds: string[] }>}
 */
async function ingestDocument(options) {
  const { filePath, title, category = 'general', tags = [], uploadedBy, mimeType } = options;
  const KnowledgeDoc = mongoose.model('KnowledgeDoc');

  // 1. Parse text
  const rawText = await parseDocument(filePath, mimeType);

  // 2. Generate summary (first 500 chars)
  const summary = rawText.slice(0, 500).replace(/\s+/g, ' ').trim();

  // 3. Chunk the document
  const chunks = chunkText(rawText, 1000, 100);

  // 4. Find or create parent doc record
  const parentDoc = await new KnowledgeDoc({
    title, content: rawText.slice(0, 2000), summary, category, tags,
    source: path.basename(filePath), mimeType: mimeType || 'text/plain',
    uploadedBy, chunkIndex: 0,
  }).save();

  const docIds = [parentDoc._id.toString()];

  // 5. Embed and save each chunk
  for (let i = 0; i < chunks.length; i++) {
    const embedding = await generateEmbedding(chunks[i]);

    await new KnowledgeDoc({
      title: `${title} [chunk ${i + 1}]`,
      content: chunks[i],
      summary: chunks[i].slice(0, 200),
      category, tags, source: path.basename(filePath),
      mimeType, uploadedBy,
      embeddings: embedding,
      chunkIndex: i + 1,
      parentDoc: parentDoc._id,
    }).save();
  }

  return { success: true, docCount: chunks.length + 1, docIds };
}

// ─── Semantic Search ──────────────────────────────────────────────────────────

/**
 * Search the knowledge base using semantic similarity
 * @param {string} query
 * @param {object} options
 * @returns {Promise<Array>}
 */
async function semanticSearch(query, options = {}) {
  const { topK = 5, category = null, minScore = 0.5 } = options;
  const KnowledgeDoc = mongoose.model('KnowledgeDoc');

  // 1. First try MongoDB full-text search (fast, free)
  const textFilter = { isActive: true, $text: { $search: query } };
  if (category) textFilter.category = category;

  const textResults = await KnowledgeDoc
    .find(textFilter, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(topK)
    .lean()
    .catch(() => []);

  if (textResults.length >= topK || !openaiClient) {
    return textResults.map(doc => ({
      ...doc,
      similarity: doc.score / 10, // normalize text score
      matchType: 'text',
    }));
  }

  // 2. Semantic/vector search (requires embeddings)
  const queryEmbedding = await generateEmbedding(query);
  if (!queryEmbedding) return textResults;

  const docsWithEmbeddings = await KnowledgeDoc
    .find({ isActive: true, embeddings: { $exists: true, $not: { $size: 0 } }, ...(category ? { category } : {}) })
    .lean();

  const scored = docsWithEmbeddings
    .map(doc => ({ ...doc, similarity: cosineSimilarity(queryEmbedding, doc.embeddings) }))
    .filter(doc => doc.similarity >= minScore)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

  return scored.map(d => ({ ...d, matchType: 'semantic' }));
}

// ─── List & Delete ────────────────────────────────────────────────────────────

async function listDocuments(options = {}) {
  const KnowledgeDoc = mongoose.model('KnowledgeDoc');
  const { category, page = 1, limit = 20 } = options;

  const filter = { isActive: true, chunkIndex: 0 }; // root docs only
  if (category) filter.category = category;

  const [docs, total] = await Promise.all([
    KnowledgeDoc.find(filter).select('-content -embeddings').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    KnowledgeDoc.countDocuments(filter),
  ]);

  return { docs, total, page, totalPages: Math.ceil(total / limit) };
}

async function deleteDocument(docId) {
  const KnowledgeDoc = mongoose.model('KnowledgeDoc');
  const doc = await KnowledgeDoc.findById(docId);
  if (!doc) throw new Error('Document not found');

  // Soft delete parent + all chunks
  await KnowledgeDoc.updateMany(
    { $or: [{ _id: docId }, { parentDoc: docId }] },
    { $set: { isActive: false } }
  );

  return { success: true };
}

module.exports = { ingestDocument, semanticSearch, listDocuments, deleteDocument, generateEmbedding, setClient };

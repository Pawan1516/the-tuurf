'use strict';
/**
 * ─── AI PLATFORM API ROUTES ──────────────────────────────────────────────────
 * /api/ai-platform/*
 */

const express = require('express');
const router  = express.Router();
const verifyToken = require('../middleware/verifyToken');

// ── Lazy-load orchestrator (avoids circular dep at boot) ──────────────────────
let _orchestrator = null;
function getOrchestrator() {
  if (!_orchestrator) {
    try {
      const { AIOrchestrator } = require('../src/ai-platform/orchestrator/AIOrchestrator');
      _orchestrator = new AIOrchestrator();
    } catch (e) {
      console.error('[aiPlatform route] orchestrator init error:', e.message);
    }
  }
  return _orchestrator;
}

// ── Models ───────────────────────────────────────────────────────────────────
const AIConversation   = require('../models/AIConversation');
const SupportTicket    = require('../models/SupportTicket');
const { semanticSearch, listDocuments, deleteDocument, ingestDocument } = require('../src/ai-platform/knowledge/KnowledgeBase');
const { ragQuery }     = require('../src/ai-platform/knowledge/RAGEngine');
const WorkflowEngine   = require('../src/ai-platform/workflows/WorkflowEngine');
const mongoose         = require('mongoose');
const multer           = require('multer');
const path             = require('path');
const fs               = require('fs');

// ── File upload config ────────────────────────────────────────────────────────
const upload = multer({
  dest: path.join(__dirname, '../uploads/knowledge'),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter(req, file, cb) {
    const allowed = ['.pdf', '.txt', '.md', '.docx'];
    const ext     = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// CHAT ENDPOINT  POST /api/ai-platform/chat
// ─────────────────────────────────────────────────────────────────────────────
router.post('/chat', async (req, res) => {
  try {
    const { message, sessionId, channel = 'web' } = req.body;
    const userId = req.user?._id?.toString() || req.body.userId || 'anonymous';

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    const orchestrator = getOrchestrator();
    if (!orchestrator) {
      return res.json({
        success: true,
        reply: "I'm initializing. Please try again in a moment.",
        intent: 'GENERAL',
        suggestions: ['Book a slot', 'Check availability', 'Contact support'],
      });
    }

    const result = await orchestrator.orchestrate({
      message: message.trim(),
      userId,
      sessionId: sessionId || `${userId}-${Date.now()}`,
      channel,
      context: { user: req.user || null },
    });

    // Persist conversation
    AIConversation.findOneAndUpdate(
      { sessionId: result.sessionId || sessionId },
      {
        $push: {
          messages: [
            { role: 'user',      content: message, intent: result.intent, timestamp: new Date() },
            { role: 'assistant', content: result.reply, timestamp: new Date() },
          ],
        },
        $set: {
          userId: userId === 'anonymous' ? null : userId,
          channel,
          agentType: result.agentType || 'customer_support',
          intent: result.intent,
        },
        $setOnInsert: { sessionId: result.sessionId || sessionId },
      },
      { upsert: true, new: true }
    ).catch(() => {});

    res.json(result);
  } catch (err) {
    console.error('[AI Platform /chat]', err);
    res.json({
      success: true,
      reply: "I'm having a brief issue. Please try again.",
      intent: 'GENERAL',
      suggestions: [],
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CONVERSATIONS  GET /api/ai-platform/conversations
// ─────────────────────────────────────────────────────────────────────────────
router.get('/conversations', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, channel, resolution } = req.query;
    const filter = {};
    if (channel)    filter.channel    = channel;
    if (resolution) filter.resolution = resolution;

    // Non-admin users can only see their own conversations
    if (req.user.role !== 'admin') {
      filter.userId = req.user._id;
    }

    const [conversations, total] = await Promise.all([
      AIConversation.find(filter)
        .populate('userId', 'name email phone')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean(),
      AIConversation.countDocuments(filter),
    ]);

    res.json({ success: true, conversations, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS   GET /api/ai-platform/analytics
// ─────────────────────────────────────────────────────────────────────────────
router.get('/analytics', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin only' });

    const now   = new Date();
    const day   = new Date(now); day.setHours(0, 0, 0, 0);
    const week  = new Date(now - 7  * 86400000);
    const month = new Date(now - 30 * 86400000);

    const [
      totalConversations, todayConversations, weekConversations,
      resolved, escalated, openTickets,
      channelBreakdown,
    ] = await Promise.all([
      AIConversation.countDocuments(),
      AIConversation.countDocuments({ createdAt: { $gte: day } }),
      AIConversation.countDocuments({ createdAt: { $gte: week } }),
      AIConversation.countDocuments({ resolution: 'resolved' }),
      AIConversation.countDocuments({ resolution: 'escalated' }),
      SupportTicket.countDocuments({ status: 'open' }),
      AIConversation.aggregate([
        { $group: { _id: '$channel', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    const resolutionRate = totalConversations > 0
      ? ((resolved / totalConversations) * 100).toFixed(1)
      : '0.0';

    res.json({
      success: true,
      analytics: {
        totalConversations, todayConversations, weekConversations,
        resolved, escalated, openTickets,
        resolutionRate: parseFloat(resolutionRate),
        channelBreakdown,
        generatedAt: now.toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SUPPORT TICKETS
// ─────────────────────────────────────────────────────────────────────────────
router.get('/tickets', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, priority } = req.query;
    const filter = {};
    if (status)   filter.status   = status;
    if (priority) filter.priority = priority;
    if (req.user.role !== 'admin') filter.userId = req.user._id;

    const [tickets, total] = await Promise.all([
      SupportTicket.find(filter)
        .populate('userId', 'name email phone')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean(),
      SupportTicket.countDocuments(filter),
    ]);

    res.json({ success: true, tickets, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch('/tickets/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin only' });
    const { status, resolution, assignedTo, priority } = req.body;
    const update = {};
    if (status)     update.status     = status;
    if (resolution) update.resolution = resolution;
    if (assignedTo) update.assignedTo = assignedTo;
    if (priority)   update.priority   = priority;
    if (status === 'resolved') update.resolvedAt = new Date();

    const ticket = await SupportTicket.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });
    res.json({ success: true, ticket });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// KNOWLEDGE BASE
// ─────────────────────────────────────────────────────────────────────────────
router.get('/knowledge', verifyToken, async (req, res) => {
  try {
    const { category, page = 1, limit = 20 } = req.query;
    const result = await listDocuments({ category, page: parseInt(page), limit: parseInt(limit) });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/knowledge/search', async (req, res) => {
  try {
    const { query, topK = 5, category } = req.body;
    if (!query) return res.status(400).json({ success: false, error: 'query required' });

    const docs = await semanticSearch(query, { topK, category });
    res.json({ success: true, docs, count: docs.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/knowledge/rag', async (req, res) => {
  try {
    const { query, conversationHistory, category } = req.body;
    if (!query) return res.status(400).json({ success: false, error: 'query required' });

    const result = await ragQuery(query, { conversationHistory, category });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/knowledge/upload', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin only' });
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

    const { title, category = 'general', tags = '' } = req.body;
    const tagArray = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];

    const result = await ingestDocument({
      filePath:   req.file.path,
      title:      title || req.file.originalname,
      category,
      tags:       tagArray,
      uploadedBy: req.user._id,
      mimeType:   req.file.mimetype,
    });

    // Clean up temp file
    fs.unlink(req.file.path, () => {});

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/knowledge/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin only' });
    const result = await deleteDocument(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// WORKFLOWS
// ─────────────────────────────────────────────────────────────────────────────
router.get('/workflows', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin only' });
    const workflows = WorkflowEngine.getWorkflows();
    res.json({ success: true, workflows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/workflows/:id/execute', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin only' });
    const result = await WorkflowEngine.executeWorkflow(req.params.id, req.body, 'manual');
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/workflows/history', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin only' });
    const history = await WorkflowEngine.getExecutionHistory(req.query.workflowId, 20);
    res.json({ success: true, history });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// AGENTS STATUS  GET /api/ai-platform/agents/status
// ─────────────────────────────────────────────────────────────────────────────
router.get('/agents/status', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin only' });

    const agents = [
      { id: 'customer_support', name: 'Customer Support Agent',  status: 'active', type: 'support'    },
      { id: 'sales',            name: 'Sales Agent',             status: 'active', type: 'sales'      },
      { id: 'analytics',        name: 'Analytics Agent',         status: 'active', type: 'analytics'  },
      { id: 'operations',       name: 'Operations Agent',        status: 'active', type: 'operations' },
      { id: 'security',         name: 'Security Agent',          status: 'active', type: 'security'   },
      { id: 'scheduling',       name: 'Scheduling Agent',        status: 'active', type: 'scheduling' },
      { id: 'executive',        name: 'Executive AI Assistant',  status: 'active', type: 'executive'  },
      { id: 'voice',            name: 'Voice Call Agent',        status: !!process.env.TWILIO_ACCOUNT_SID ? 'active' : 'degraded', type: 'voice' },
    ];

    res.json({ success: true, agents, totalActive: agents.filter(a => a.status === 'active').length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

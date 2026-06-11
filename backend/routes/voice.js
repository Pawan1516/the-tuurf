'use strict';
/**
 * ─── VOICE ROUTES ────────────────────────────────────────────────────────────
 * /api/voice/*  — Twilio webhooks + admin controls
 */

const express     = require('express');
const router      = express.Router();
const twilio      = require('twilio');
const verifyToken = require('../middleware/verifyToken');
const VoiceCall   = require('../models/VoiceCall');

let VoiceEngine = null;
function getVoiceEngine() {
  if (!VoiceEngine) {
    try { VoiceEngine = require('../src/ai-platform/voice/VoiceCallEngine'); } catch { /* not ready */ }
  }
  return VoiceEngine;
}

const BASE_URL = () => process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

// ─── Twilio Webhook Validation Middleware ────────────────────────────────────
function validateTwilio(req, res, next) {
  if (process.env.NODE_ENV !== 'production') return next();
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return next(); // Dev mode — skip
  const valid = twilio.validateRequest(
    authToken,
    req.headers['x-twilio-signature'] || '',
    `${BASE_URL()}${req.originalUrl}`,
    req.body
  );
  if (!valid) return res.status(403).send('Forbidden');
  next();
}

// ─── POST /api/voice/inbound ─────────────────────────────────────────────────
router.post('/inbound', validateTwilio, async (req, res) => {
  try {
    const engine = getVoiceEngine();
    if (!engine) {
      const { twiml: { VoiceResponse } } = twilio;
      const twiml = new VoiceResponse();
      twiml.say({ voice: 'Polly.Aditi', language: 'en-IN' }, 'Thank you for calling The Turf. Our AI system is initializing. Please call back in a moment.');
      twiml.hangup();
      return res.type('text/xml').send(twiml.toString());
    }

    const twiml = await engine.handleInbound(req, BASE_URL());
    res.type('text/xml').send(twiml);
  } catch (err) {
    console.error('[voice/inbound]', err);
    res.type('text/xml').send('<Response><Say>We encountered an error. Goodbye.</Say><Hangup/></Response>');
  }
});

// ─── POST /api/voice/gather ──────────────────────────────────────────────────
router.post('/gather', validateTwilio, async (req, res) => {
  try {
    const engine = getVoiceEngine();
    if (!engine) return res.type('text/xml').send('<Response><Hangup/></Response>');

    const twiml = await engine.handleGather(req, BASE_URL());
    res.type('text/xml').send(twiml);
  } catch (err) {
    console.error('[voice/gather]', err);
    res.type('text/xml').send('<Response><Say>I had trouble understanding that. Goodbye.</Say><Hangup/></Response>');
  }
});

// ─── POST /api/voice/status ──────────────────────────────────────────────────
router.post('/status', async (req, res) => {
  try {
    const engine = getVoiceEngine();
    if (engine) await engine.handleStatusCallback(req);
    res.status(200).send('OK');
  } catch (err) {
    console.error('[voice/status]', err);
    res.status(200).send('OK');
  }
});

// ─── POST /api/voice/outbound-start ─────────────────────────────────────────
router.post('/outbound-start', validateTwilio, async (req, res) => {
  const { purpose = 'general', userId } = req.query;
  const { twiml: { VoiceResponse } } = twilio;
  const vr     = new VoiceResponse();
  const gather = vr.gather({
    input:  'dtmf speech',
    action: `${BASE_URL()}/api/voice/gather`,
    method: 'POST',
    numDigits: 1,
    timeout: 10,
    speechTimeout: 'auto',
  });

  const scripts = {
    booking_confirmation: 'Hello! This is The Turf AI assistant. Your turf booking has been confirmed. Press 1 to confirm attendance, Press 2 to cancel, or Press 3 to reschedule.',
    reminder:             'Hello! This is a friendly reminder from The Turf. You have a booking in one hour. Press 1 to confirm attendance, or Press 2 if you cannot attend.',
    followup:             'Hello! This is The Turf calling to follow up on your recent visit. Could you share your experience? Press 1 for excellent, Press 2 for good, Press 3 for needs improvement.',
    general:              'Hello! This is The Turf AI assistant. How may I help you today?',
  };

  gather.say({ voice: 'Polly.Aditi', language: 'en-IN' }, scripts[purpose] || scripts.general);
  vr.hangup();
  res.type('text/xml').send(vr.toString());
});

// ─── POST /api/voice/call  (Admin: trigger outbound call) ────────────────────
router.post('/call', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin only' });
    const { to, purpose = 'general', userId } = req.body;
    if (!to) return res.status(400).json({ success: false, error: 'to (phone number) required' });

    const engine = getVoiceEngine();
    if (!engine) return res.status(503).json({ success: false, error: 'Voice engine not ready' });

    const result = await engine.initiateOutbound({
      to, purpose, userId,
      from:    process.env.TWILIO_PHONE_NUMBER,
      baseUrl: BASE_URL(),
    });

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/voice/calls  (Admin: list calls) ───────────────────────────────
router.get('/calls', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin only' });
    const { page = 1, limit = 20, status, direction } = req.query;
    const filter = {};
    if (status)    filter.status    = status;
    if (direction) filter.direction = direction;

    const [calls, total] = await Promise.all([
      VoiceCall.find(filter).populate('userId', 'name phone').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit)).lean(),
      VoiceCall.countDocuments(filter),
    ]);

    res.json({ success: true, calls, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/voice/calls/:id  (Admin: single call detail) ───────────────────
router.get('/calls/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin only' });
    const call = await VoiceCall.findById(req.params.id).populate('userId', 'name phone email').lean();
    if (!call) return res.status(404).json({ success: false, error: 'Call not found' });
    res.json({ success: true, call });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

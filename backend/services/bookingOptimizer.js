/**
 * 🤖 AUTONOMOUS BOOKING OPTIMIZER
 * Agentic AI that analyzes slot utilization, identifies patterns,
 * and automatically triggers WhatsApp notifications to maximize bookings.
 * Runs on a configurable schedule (default: every hour).
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Slot = require('../models/Slot');
const Booking = require('../models/Booking');
const { sendWhatsAppNotification } = require('./whatsapp');

// ─── AI Engine Setup ─────────────────────────────────────────────────────────
const getAI = () => {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    return genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: { responseMimeType: 'application/json' }
    });
};

// ─── Data Collectors ──────────────────────────────────────────────────────────
const collectSlotData = async () => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const next7Days = new Date(today);
    next7Days.setDate(next7Days.getDate() + 7);

    const slots = await Slot.find({
        date: { $gte: today, $lte: next7Days }
    }).sort({ date: 1, startTime: 1 }).lean();

    // Summarize for AI
    const summary = {
        total: slots.length,
        free: slots.filter(s => s.status === 'free').length,
        booked: slots.filter(s => s.status === 'booked').length,
        hold: slots.filter(s => s.status === 'hold').length,
        utilizationRate: slots.length > 0
            ? ((slots.filter(s => s.status === 'booked').length / slots.length) * 100).toFixed(1) + '%'
            : '0%',
        byDay: {}
    };

    // Group by date
    slots.forEach(s => {
        const day = s.date.toISOString().split('T')[0];
        if (!summary.byDay[day]) summary.byDay[day] = { free: 0, booked: 0 };
        if (s.status === 'free') summary.byDay[day].free++;
        if (s.status === 'booked') summary.byDay[day].booked++;
    });

    return summary;
};

const collectBookingData = async () => {
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const bookings = await Booking.find({
        createdAt: { $gte: last7Days }
    }).lean();

    const hourCounts = {};
    bookings.forEach(b => {
        const hour = b.startTime ? b.startTime.split(':')[0] : null;
        if (hour) hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const peakHours = Object.entries(hourCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([h]) => `${h}:00`);

    const lowHours = Object.entries(hourCounts)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 3)
        .map(([h]) => `${h}:00`);

    return {
        totalLast7Days: bookings.length,
        confirmedCount: bookings.filter(b => b.bookingStatus === 'confirmed').length,
        cancelledCount: bookings.filter(b => b.bookingStatus === 'cancelled').length,
        peakHours,
        lowDemandHours: lowHours,
        avgPerDay: (bookings.length / 7).toFixed(1)
    };
};

const collectUserData = async () => {
    const mongoose = require('mongoose');
    const User = mongoose.models.User || require('../models/User');

    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const [total, recentBookers] = await Promise.all([
        User.countDocuments(),
        Booking.distinct('userPhone', { createdAt: { $gte: last30Days } })
    ]);

    return {
        totalUsers: total,
        activeUsersLast30Days: recentBookers.length,
        inactiveUsers: Math.max(0, total - recentBookers.length)
    };
};

// ─── AI Decision Engine ───────────────────────────────────────────────────────
const runAIOptimizer = async () => {
    const model = getAI();

    const [slotData, bookingData, userData] = await Promise.all([
        collectSlotData(),
        collectBookingData(),
        collectUserData()
    ]);

    const istTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    const prompt = `You are an autonomous booking manager AI for a cricket turf booking application.

Your goal is to maximize bookings, improve slot utilization, and increase user engagement.

Analyze the data and decide actions automatically.

-------------------------------------

INPUT DATA:

Slot Data:
${JSON.stringify(slotData, null, 2)}

User Data:
${JSON.stringify(userData, null, 2)}

Booking Data:
${JSON.stringify(bookingData, null, 2)}

Time:
${istTime}

-------------------------------------

TASKS:

1. Identify empty or low-booked slots
2. Detect peak and low-demand times
3. Decide if any action is needed
4. Suggest actions to improve bookings:
   - Send notifications
   - Apply discounts
   - Highlight popular slots
   - Do nothing if system is stable

-------------------------------------

OUTPUT FORMAT (STRICT JSON):

{
  "status": "stable / action_needed",
  "actions": [
    "Send notification to users",
    "Apply 10% discount on 5-7 PM slot"
  ],
  "targetUsers": "which users to target (e.g., inactive users, regular players)",
  "prioritySlots": ["slot1", "slot2"],
  "reason": "Short explanation of why these actions are needed"
}

-------------------------------------

RULES:

- Only suggest actions if necessary
- Keep actions practical and executable
- Do not add any text outside JSON
- Keep reason short (1-2 lines)`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    try {
        return JSON.parse(text);
    } catch (e) {
        // Fallback: strip markdown blocks if AI ignored responseMimeType
        const clean = text.replace(/```json|```/g, "").trim();
        return JSON.parse(clean);
    }
};

// ─── Action Executor ──────────────────────────────────────────────────────────
const executeActions = async (decision) => {
    const log = [];

    if (decision.status !== 'action_needed') {
        console.log('🤖 Optimizer: System stable, no actions required.');
        return log;
    }

    console.log(`🤖 Optimizer: Action needed — ${decision.reason}`);

    for (const action of decision.actions) {
        const lowerAction = action.toLowerCase();

        // --- Notification Action ---
        if (lowerAction.includes('notification') || lowerAction.includes('notify')) {
            try {
                const adminPhone = process.env.ADMIN_PHONE;
                if (adminPhone) {
                    const slotsInfo = decision.prioritySlots?.join(', ') || 'upcoming slots';
                    const msg = `🤖 *AI Booking Alert*\n\n📊 ${decision.reason}\n\n🎯 Priority Slots: ${slotsInfo}\n👤 Target: ${decision.targetUsers || 'All users'}\n\n💡 Action: ${action}\n\n📅 Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;
                    await sendWhatsAppNotification(adminPhone, msg, null, 'ai_optimizer');
                    log.push({ action: 'admin_notified', status: 'done', detail: action });
                    console.log(`✅ Optimizer: Admin notified — ${action}`);
                }
            } catch (err) {
                log.push({ action: 'admin_notified', status: 'failed', error: err.message });
                console.error('❌ Optimizer: Notification failed:', err.message);
            }
        }

        // --- Discount Action (logged, must be applied manually or via promo code system) ---
        if (lowerAction.includes('discount')) {
            console.log(`💰 Optimizer: Discount recommended — "${action}". Apply via Admin Panel.`);
            log.push({ action: 'discount_suggested', status: 'logged', detail: action });
        }

        // --- Highlight Slot Action ---
        if (lowerAction.includes('highlight')) {
            console.log(`⭐ Optimizer: Highlight recommended — "${action}"`);
            log.push({ action: 'highlight_suggested', status: 'logged', detail: action });
        }
    }

    return log;
};

// ─── Main Run Function ────────────────────────────────────────────────────────
const runBookingOptimizer = async () => {
    console.log('\n🤖 ═══════ BOOKING OPTIMIZER RUNNING ═══════');
    try {
        const decision = await runAIOptimizer();
        console.log('🧠 AI Decision:', JSON.stringify(decision, null, 2));

        const log = await executeActions(decision);

        return { success: true, decision, actionsLog: log, timestamp: new Date() };
    } catch (err) {
        console.error('❌ Booking Optimizer Error:', err.message);
        return { success: false, error: err.message };
    } finally {
        console.log('🤖 ═══════════════════════════════════════\n');
    }
};

module.exports = { runBookingOptimizer };

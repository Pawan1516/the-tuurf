const express = require('express');
const router = express.Router();
const AIService = require('../services/aiService');
const Match = require('../models/Match');
const User = require('../models/User');
const verifyToken = require('../middleware/verifyToken');
const { slotBookingAgent, revenueBookingAnalyst, notificationAgent } = require('../services/demoAgents');
const Slot = require('../models/Slot');
const Booking = require('../models/Booking');
const { sendWhatsAppNotification } = require('../services/whatsapp');

// @route   POST /api/ai/commentary
// @desc    Generate ball commentary
// @access  Private (Scorer/Admin)
router.post('/commentary', verifyToken, async (req, res) => {
    try {
        const { ball, batsman, bowler, match, situation } = req.body;
        const commentary = await AIService.generateCommentary({ ball, batsman, bowler, match, situation });
        res.json({ success: true, commentary });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   POST /api/ai/chat
// @desc    TurfBot chat interaction
// @access  Private
router.post('/chat', verifyToken, async (req, res) => {
    try {
        const { message, conversationHistory = [] } = req.body;
        
        const user = await User.findById(req.user.id);
        const userContext = {
            name: user.name,
            stats: user.stats,
            cricket_profile: user.cricket_profile,
            teams_count: user.teams.length
        };

        const reply = await AIService.turfBotChat(message, conversationHistory, userContext);
        res.json({ success: true, reply });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   GET /api/ai/post-match/:matchId/:uid
// @desc    Individual post-match report
// @access  Private
router.get('/post-match/:matchId/:uid', verifyToken, async (req, res) => {
    try {
        const match = await Match.findById(req.params.matchId);
        const player = await User.findById(req.params.uid);
        
        if (!match || !player) return res.status(404).json({ success: false, message: 'Entity not found.' });

        // Extract player specific stats for this match (Placeholder logic)
        const playerMatchData = {
            runs: 34,
            balls: 21,
            wickets: 2,
            moment: 'Stumped at over 15'
        };

        const report = await AIService.generatePostMatchReport(match, playerMatchData);
        res.json({ success: true, report });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   POST /api/ai/recommend-slot
// @desc    Get AI slot recommendation based on agentic AI
// @access  Private
router.post('/recommend-slot', verifyToken, async (req, res) => {
    try {
        const { date, preference } = req.body;
        
        let targetDate = new Date();
        if (date) {
            targetDate = new Date(date);
        }
        targetDate.setUTCHours(0,0,0,0);
        
        const slotsObj = await Slot.find({ date: targetDate, status: 'free' }).select('startTime -_id').lean();
        
        const slotsForAI = slotsObj.map(s => {
            const h = parseInt(s.startTime.split(':')[0]);
            let crowd = 'low';
            let recommended = false;
            
            // Basic crowd level mock based on time
            if (h >= 17) {
                crowd = 'high';
                if (h === 18) recommended = true;
            } else if (h >= 12) {
                crowd = 'medium';
            }
            
            return {
                time: s.startTime,
                available: true,
                crowd,
                ...(recommended && { recommended: true })
            };
        });

        const recommendation = await slotBookingAgent(slotsForAI, preference || 'evening');
        res.json({ success: true, recommendation });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   POST /api/ai/analyze-revenue
// @desc    Get REAL AI business analyst insights
// @access  Private (Admin)
router.post('/analyze-revenue', verifyToken, async (req, res) => {
    try {
        const { analysisType } = req.body;
        
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
        // Fetch Real Booking Aggregates
        const [totalBookings, revenueData, slotsSummary] = await Promise.all([
            Booking.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
            Booking.aggregate([
                { $match: { createdAt: { $gte: thirtyDaysAgo }, bookingStatus: 'confirmed' } },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]),
            Slot.countDocuments({ status: 'free', date: { $gte: new Date() } })
        ]);

        const bookingData = {
          period: "Last 30 Days",
          total_bookings: totalBookings,
          revenue: revenueData[0]?.total || 0,
          upcoming_availability: slotsSummary,
          system_status: "Operational"
        };

        const insights = await revenueBookingAnalyst(analysisType || "Revenue optimization & strategy", bookingData);
        res.json({ success: true, insights });
    } catch (err) {
        console.error("AI Analysis Error:", err);
        res.status(500).json({ success: false, message: `AI Analysis blocked: ${err.message}` });
    }
});

// @route   POST /api/ai/generate-notifications
// @desc    Get REAL AI contextual notifications
// @access  Private (Admin)
router.post('/generate-notifications', verifyToken, async (req, res) => {
    try {
        const { context, matchInfo } = req.body;
        
        // Fetch actual live matches on the turf
        let matchInfoStr = matchInfo;
        if (!matchInfoStr) {
            const liveMatch = await Match.findOne({ status: 'In Progress' }).populate('team_a.team_id team_b.team_id').sort({ updatedAt: -1 });
            if (liveMatch) {
                matchInfoStr = `LIVE SCORE: ${liveMatch.team_a.team_id?.name || 'A'} vs ${liveMatch.team_b.team_id?.name || 'B'}. Result so far: ${liveMatch.result?.winner || 'Pending'}`;
            } else {
                matchInfoStr = "No live matches. Generic turf promo.";
            }
        }

        // Fetch Real availability for tonight
        const tonight = new Date();
        tonight.setUTCHours(12,0,0,0); // Check from noon onwards
        const slotsObj = await Slot.find({ date: { $gte: new Date() }, status: 'free' }).limit(5);

        const businessData = {
            available_slots_count: slotsObj.length,
            next_available: slotsObj[0]?.startTime || "Not found",
            peak_demand_tonight: "High (6PM-10PM)"
        };

        const result = await notificationAgent(
            context || "Contextual push for tonight",
            matchInfoStr,
            businessData
        );
        
        let parsedNotifications = result;
        if (typeof result === 'string') {
            try {
                parsedNotifications = JSON.parse(result);
            } catch(e) {
                const clean = result.replace(/```json|```/g, "").trim();
                parsedNotifications = JSON.parse(clean);
            }
        }

        res.json({ success: true, notifications: parsedNotifications.notifications || parsedNotifications, contextUsed: matchInfoStr });
    } catch (err) {
        console.error("Notification Generation AI Error (Providing Fallback):", err);
        // Robust Fallback if AI is blocked or key fails
        const fallback = [
            { icon: "🏏", title: "Slots Available!", body: "Turf slots for tonight are still open. Book now!" },
            { icon: "🔥", title: "Live Scoring", body: "Matches are live at the turf. Check out the leaderboard!" },
            { icon: "🏟️", title: "The Turf", body: "Need a game? Book your favorite slot in seconds." }
        ];
        res.json({ success: true, notifications: fallback, message: "AI Generator busy - providing high-quality defaults." });
    }
});

// @route   POST /api/ai/broadcast-notification
// @desc    Broadcast an AI generated notification to users
// @access  Private (Admin)
router.post('/broadcast-notification', verifyToken, async (req, res) => {
    try {
        const { title, body } = req.body;
        if (!title || !body) return res.status(400).json({ success: false, message: "Missing notification content" });

        // Get all unique phone numbers - using 365 days to ensure we find your test users!
        const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        const recentNumbers = await Booking.find({ createdAt: { $gte: yearAgo } }).distinct('userPhone');
        
        if (recentNumbers.length === 0) {
            console.warn("⚠️ No booking phone numbers found in the database. Broadcast cancelled.");
            return res.json({ success: false, message: "No users found with recent bookings. Try making a test booking first!" });
        }

        console.log(`📣 Broadcasting to ${recentNumbers.length} unique phone numbers found.`);

        let successCount = 0;
        let failCount = 0;
        const msgText = `🔔 *${title}*\n\n${body}`;

        // 1. WhatsApp Broadcast (Keep existing)
        for (const phone of recentNumbers) {
            if (phone && phone.length >= 10) {
                try {
                    const clean = phone.replace(/\D/g,'').slice(-10);
                    const formatted = `whatsapp:+91${clean}`;
                    const result = await sendWhatsAppNotification(formatted, msgText);
                    if (result.success) successCount++;
                    else failCount++;
                } catch(e) { failCount++; }
                await new Promise(r => setTimeout(r, 200));
            }
        }

        // 2. WEB PUSH Broadcast (FCM)
        let fcmSuccess = 0;
        let fcmFail = 0;
        try {
            const firebase = require('../services/firebase');
            
            // Collect tokens from all models
            const [users, admins, workers] = await Promise.all([
                User.find({ fcmToken: { $ne: null } }).select('fcmToken'),
                Admin.find({ fcmToken: { $ne: null } }).select('fcmToken'),
                Worker.find({ fcmToken: { $ne: null } }).select('fcmToken')
            ]);

            const tokens = [
                ...users.map(u => u.fcmToken),
                ...admins.map(a => a.fcmToken),
                ...workers.map(w => w.fcmToken)
            ];

            if (tokens.length > 0) {
                const message = {
                    notification: { title, body },
                    tokens: tokens,
                };
                const response = await firebase.messaging().sendEachForMulticast(message);
                fcmSuccess = response.successCount;
                fcmFail = response.failureCount;
                console.log(`🚀 FCM Broadcast: ${fcmSuccess} success, ${fcmFail} fail.`);
            }
        } catch (fcmErr) {
            console.error("FCM Broadcast Error:", fcmErr.message);
        }

        res.json({ 
            success: true, 
            message: `Notification broadcasted.`,
            whatsapp: { success: successCount, fail: failCount },
            webPush: { success: fcmSuccess, fail: fcmFail }
        });
    } catch (err) {
        console.error("Broadcast Error:", err);
        res.status(500).json({ success: false, message: `Broadcast Engine Error: ${err.message}` });
    }
});

// @route   GET /api/ai/expert-hub
// @desc    Get real-time AI expert hub strategy (4 experts)
// @access  Private (Admin)
const ExpertStrategy = require('../services/expertStrategyService');
router.get('/expert-hub', verifyToken, async (req, res) => {
    try {
        const report = await ExpertStrategy.generateExpertStrategyReport();
        res.json({ success: true, report });
    } catch (err) {
        console.error("AI Expert Hub Error:", err);
        res.status(500).json({ success: false, message: `Strategy Engine Overload: ${err.message}` });
    }
});

module.exports = router;

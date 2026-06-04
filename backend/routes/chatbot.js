const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Match = require('../models/Match');

/**
 * @route   POST /api/chatbot
 * @desc    Local NLP-based chatbot (no external API) fetching real MongoDB data
 * @access  Public
 */
router.post('/', async (req, res) => {
    try {
        console.log('🤖 NLP Chatbot Request Received:', req.body.message);
        const { message } = req.body;
        if (!message) return res.status(400).json({ success: false, reply: 'Message is required' });

        const text = message.toLowerCase();

        // Data fetching
        const bookings = await Booking.find({ bookingStatus: 'confirmed' });
        const matches = await Match.find();

        // NLP INTENT DETECTION

        // 1. TODAY INTENT (Advanced NLP)
        if (text.includes("today")) {
            const today = new Date();
            today.setHours(0,0,0,0);
            const todayBookings = bookings.filter(b => new Date(b.createdAt) >= today);
            
            if (text.includes("booking")) {
                return res.json({ reply: `There are ${todayBookings.length} bookings today.` });
            }
            if (text.includes("revenue")) {
                const todayRev = todayBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
                return res.json({ reply: `Today's revenue is ₹${todayRev.toLocaleString()}` });
            }
        }

        // 2. TOTAL BOOKINGS INTENT
        if (text.includes("booking")) {
            return res.json({
                reply: `Total confirmed bookings processed: ${bookings.length}`
            });
        }

        // 3. REVENUE INTENT
        if (text.includes("revenue")) {
            const total = bookings.reduce(
                (sum, b) => sum + (b.amount || 0), 0
            );
            return res.json({
                reply: `Total generated revenue is ₹${total.toLocaleString()}`
            });
        }

        // 4. TOP TURF INTENT
        if (text.includes("turf")) {
            const turfCount = {};
            bookings.forEach(b => {
                const tName = b.turfLocation || 'Default Turf';
                turfCount[tName] = (turfCount[tName] || 0) + 1;
            });

            if (Object.keys(turfCount).length === 0) {
                return res.json({ reply: "No turf data available yet." });
            }

            const topTurf = Object.keys(turfCount).reduce((a, b) =>
                turfCount[a] > turfCount[b] ? a : b
            );

            return res.json({
                reply: `The most popular turf right now is ${topTurf}`
            });
        }

        // 5. TOP PLAYER INTENT (Advanced NLP)
        if (text.includes("player") || text.includes("top scorer")) {
            // Calculate highest runs across matches
            let topPlayer = "N/A";
            let maxRuns = -1;
            
            matches.forEach(m => {
                const players = [...(m.team_a?.players || []), ...(m.team_b?.players || [])];
                players.forEach(p => {
                    const runs = p.batting?.runs || 0;
                    if (runs > maxRuns) {
                        maxRuns = runs;
                        topPlayer = p.name;
                    }
                });
            });

            if (maxRuns >= 0) {
                return res.json({ reply: `The top scorer across our database is ${topPlayer} with ${maxRuns} runs.` });
            }
            return res.json({ reply: "No player stats are available yet." });
        }

        // 6. MATCH SCORE INTENT
        if (text.includes("score") || text.includes("match")) {
            const liveMatch = matches.find(m => m.status === 'LIVE' || m.status === 'IN_PROGRESS');
            if (liveMatch) {
                return res.json({ reply: `There is a live match ongoing! Current overs: ${liveMatch.live_data?.overs || 0}. Check the live dashboard for real-time scores.` });
            }
            return res.json({ reply: `We have ${matches.length} matches registered in the system. None are live right now.` });
        }

        // DEFAULT FALLBACK
        return res.json({
            reply: "I am your local NLP assistant. Please ask me about bookings, revenue, top turf, matches, or top players!"
        });

    } catch (error) {
        console.error('❌ Chatbot Error:', error);
        res.status(500).json({ success: false, reply: 'Internal Server Error processing NLP.' });
    }
});

module.exports = router;

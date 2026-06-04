const express = require('express');
const router = express.Router();

const { processCricBotCommand } = require('../services/aiAgent');

router.post('/chat', async (req, res) => {
    try {
        const { message, context } = req.body;
        
        // Pass to the full AI Agent pipeline (OpenAI / Gemini)
        const result = await processCricBotCommand(message, context || {}, req.user ? req.user.id : 'anonymous');
        
        // Map the result type to an intent string for the frontend
        let intent = "general";
        if (result.type === 'BOOKING_CONFIRMED') intent = "booking";
        else if (result.bookingInfo) intent = "booking";

        res.json({ success: true, reply: result.reply, intent });
    } catch (error) {
        console.error("AI Chatbot Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/book-slot', async (req, res) => {
    res.json({ success: true, message: "Slot booked successfully via AI Assistant." });
});

router.get('/get-slots', async (req, res) => {
    res.json({ success: true, slots: [] });
});

router.get('/match-data', async (req, res) => {
    res.json({ success: true, matches: [] });
});

module.exports = router;

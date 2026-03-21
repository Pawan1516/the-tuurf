const Anthropic = require('@anthropic-ai/sdk');
const data = require('./data');

/**
 *  AI Agent for THE TURF 🏟️
 *  Decides if a booking should be CONFIRM, HOLD, or REJECT
 */

async function analyzeBooking(userPhone, userName, sport, slotId) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const slot = data.slots.find(s => s.id == slotId);

    // 1. Pre-checks (Rule-based)
    const userBookingsCount = data.bookings.filter(b => b.userPhone === userPhone && b.status === 'confirmed').length;
    const remainingSlots = data.slots.filter(s => s.available).length;
    const isPeakHour = (slot.hour >= 17 && slot.hour <= 21); // 5 PM to 9 PM

    // 2. Logic Definitions
    let decision = "REJECT";
    let reason = "Daily limit reached (Max 3).";

    if (userBookingsCount < 3) {
        if (isPeakHour && remainingSlots <= 2) {
            decision = "HOLD";
            reason = "Peak hour congestion check.";
        } else {
            decision = "CONFIRM";
            reason = "Slot available.";
        }
    }

    // 3. AI Enhancement (Use Claude ONLY if key is present)
    if (apiKey && apiKey !== 'sk-ant-xxxxxxxxxxxxxxxx') {
        try {
            const anthropic = new Anthropic({ apiKey });
            const prompt = `You are a booking agent for THE TURF sports facility.
                Decide: CONFIRM, HOLD, or REJECT for ${userName} (${sport}).
                Slot Hour: ${slot.hour}. Remaining Available Slots: ${remainingSlots}. User Bookings Today: ${userBookingsCount}.
                RULES:
                - CONFIRM if slot available and user has < 3 bookings.
                - HOLD if peak hour (5-9 PM) AND 2 or fewer free slots remain.
                - REJECT if user has 3+ bookings today.
                Reply ONLY as JSON: {"decision":"CONFIRM","reason":"friendly short reason mentioning player name"}`;

            const response = await anthropic.messages.create({
                model: 'claude-3-sonnet-20240229',
                max_tokens: 256,
                system: 'You are a booking AI. Only output valid JSON.',
                messages: [{ role: 'user', content: prompt }]
            });

            const result = JSON.parse(response.content[0].text);
            return result;
        } catch (err) {
            console.error('Claude Agent Error, fallback to rules:', err.message);
        }
    }

    // Default to Rule-based result
    return { decision, reason };
}

module.exports = { analyzeBooking };

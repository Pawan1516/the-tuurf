/**
 * 🧠 1. Cricket Chatbot (AI Specialist) - Rule-based Code Implementation
 */
async function cricketChatbot(matchData, userInput) {
    const input = (userInput || "").toLowerCase();
    let reply = "I'm your Turf AI specialist. I don't have enough data right now, but feel free to ask about live scores or booking slots!";
    
    if (input.includes("score") || input.includes("match")) {
        reply = `The current score is ${matchData?.team_a?.score || 0}/${matchData?.team_a?.wickets || 0} vs ${matchData?.team_b?.score || 0}/${matchData?.team_b?.wickets || 0}.`;
    } else if (input.includes("who is winning") || input.includes("leading")) {
        const diff = (matchData?.team_a?.score || 0) - (matchData?.team_b?.score || 0);
        if (diff > 0) reply = `Team A is currently leading by ${diff} runs.`;
        else if (diff < 0) reply = `Team B is currently leading by ${-diff} runs.`;
        else reply = `It's a tight match! Scores are currently tied.`;
    } else if (input.includes("book") || input.includes("slot")) {
        reply = "Looking for a slot? Check our main booking page to see live availability and secure your turf!";
    }
    
    return reply;
}

/**
 * 📊 2. Match Prediction Engine - Rule-based Code Implementation
 */
async function matchPredictionEngine(matchData) {
    const scoreA = matchData?.team_a?.score || 0;
    const scoreB = matchData?.team_b?.score || 0;
    let teamA_pct = 50;
    let teamB_pct = 50;
    
    if (scoreA > scoreB) {
        teamA_pct = 65;
        teamB_pct = 35;
    } else if (scoreB > scoreA) {
        teamA_pct = 35;
        teamB_pct = 65;
    }
    
    return {
        india_pct: teamA_pct,
        australia_pct: teamB_pct,
        predicted_winner: scoreA > scoreB ? (matchData?.team_a?.team_id?.name || "Team A") : (matchData?.team_b?.team_id?.name || "Team B"),
        key_factor: "Current run rate and momentum",
        reasoning: `Based on the latest scoring trend, ${scoreA > scoreB ? "Team A" : "Team B"} has taken control of the innings.`
    };
}

/**
 * 🤖 3. Slot Booking Agent - Rule-based Code Implementation
 */
async function slotBookingAgent(slots, userPreference) {
    if (!slots || slots.length === 0) {
        return "No slots are available matching your criteria today. Try checking tomorrow!";
    }
    
    // Sort logic to prefer user Preference
    let selectedSlot = slots.find(s => 
        (userPreference === 'evening' && s.time && s.time.includes("PM") && parseInt(s.time.split(':')[0]) >= 5) ||
        (userPreference === 'morning' && s.time && s.time.includes("AM"))
    ) || slots[0];

    return `I recommend the ${selectedSlot.time} slot.\nIt matches your usual preference and currently has ${selectedSlot.crowd || 'low'} crowd, making it perfect for your game!`;
}

/**
 * 🔔 4. Notification Agent - Rule-based Code Implementation
 */
async function notificationAgent(context, matchName, businessData = {}) {
    // Generate contextually relevant push notifications in code
    const notifications = [
        {
            icon: "🚨",
            type: "ALERT",
            title: "Slot Availability Update",
            body: `Only ${businessData.available_slots_count || 'a few'} slots left for tonight at The Turf. Book now!`
        },
        {
            icon: "🔥",
            type: "LIVE",
            title: "Match Update",
            body: `${matchName || 'A live match is happening!'} Check out the explosive action.`
        },
        {
            icon: "💰",
            type: "OFFER",
            title: "Prime Time Deals",
            body: `The next available slot is at ${businessData.next_available || 'soon'}. Gather your squad!`
        }
    ];
    return { notifications };
}

/**
 * 📈 5. Revenue / Booking Analyst - Rule-based Code Implementation
 */
async function revenueBookingAnalyst(analysisType, bookingData) {
    const rev = bookingData.revenue || 0;
    const total = bookingData.total_bookings || 0;
    const type = (analysisType || "").toLowerCase();
    
    if (type.includes("pattern")) {
        return `1. Demand Concentration: Over 60% of volume is happening in evening prime time.\n2. User Trends: Based on your ${total} recent transactions, weekend bookings outpace weekdays.\n3. Recommendation: Shift maintenance windows to early mornings.`;
    } else if (type.includes("weekend")) {
        return `1. Weekend Surge: Demand is 2X higher on weekends.\n2. Capacity: Early morning slots show increased booking patterns on weekends.\n3. Action: Consider adjusting weekend prime time rates slightly higher.`;
    } else {
        return `1. Revenue Snapshot: Total collected over the period is ₹${rev.toLocaleString()}.\n2. Booking Velocity: You have processed ${total} bookings with robust infrastructure uptime.\n3. Strategic Upsell: Consider flash deals for current unbooked slots to fill remaining capacity.`;
    }
}

module.exports = {
    cricketChatbot,
    matchPredictionEngine,
    slotBookingAgent,
    notificationAgent,
    revenueBookingAnalyst
};

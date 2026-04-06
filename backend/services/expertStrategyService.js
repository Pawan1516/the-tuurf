const { GoogleGenerativeAI } = require("@google/generative-ai");
const Booking = require("../models/Booking");
const Slot = require("../models/Slot");
const User = require("../models/User");
const Match = require("../models/Match");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generate a comprehensive strategy report from four AI experts
 */
exports.generateExpertStrategyReport = async () => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // 1. Gather Real Platform Real-World Data
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
        const [
            totalBookings,
            revenueData,
            totalUsers,
            upcomingSlots,
            recentMatches,
            peakHours
        ] = await Promise.all([
            Booking.countDocuments({ createdAt: { $gte: thirtyDaysAgo }, bookingStatus: 'confirmed' }),
            Booking.aggregate([
                { $match: { createdAt: { $gte: thirtyDaysAgo }, bookingStatus: 'confirmed' } },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]),
            User.countDocuments({ role: 'PLAYER' }),
            Slot.countDocuments({ date: { $gte: new Date() }, status: 'free' }),
            Match.countDocuments({ status: 'Completed' }),
            Booking.aggregate([
                { $match: { bookingStatus: 'confirmed' } },
                { $group: { _id: "$slot.startTime", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 3 }
            ])
        ]);

        const platformData = {
            name: "The Turf",
            location: "Miyapur, Hyderabad",
            metrics: {
                last30DaysBookings: totalBookings,
                last30DaysRevenue: revenueData[0]?.total || 0,
                totalAthletes: totalUsers,
                availableInventory: upcomingSlots,
                matchesCompleted: recentMatches,
                peakDemandWindows: peakHours.map(p => p._id).join(", ")
            },
            techStack: "MERN + Socket.IO + Razorpay + Gemini AI",
            features: ["CricBot AI", "QR Entry", "Live Scoring", "WhatsApp Sync"]
        };

        const prompt = `
            You are a team of FOUR specialized AI experts analyzing "The Turf", a real-world sports platform.
            
            PLATFORM DATA:
            ${JSON.stringify(platformData, null, 2)}

            Provide a combined report from these 4 perspectives:
            1. 🤖 AI SPECIALIST: Focus on the "Connected Arena" (Socket.IO, QR, Razorpay, Automated receipt delivery). How is the technology performing?
            2. 🧠 AI ANALYST: Focus on "Player Intelligence" (Career stats, Scoreboard accuracy, Matchmaking). How are players engaging with the data?
            3. 📊 BUSINESS ANALYST: Focus on "Growth & Optimization" (Utilization vs Inventory, Revenue scaling, peak hour strategy).
            4. 📈 AI PREDICTION (STRATEGIST): Focus on the "90-Day Vision" (What should we build next? Matchmaking? Tournament automation? How do we reach 30% utilization?).

            REQUIREMENTS:
            - Each expert must sound distinct and authoritative.
            - Use real-world references to the Miyapur, Hyderabad location.
            - Mention specific features like CricBot or the QR receipt system.
            - FORMAT: Return a JSON object ONLY with the following structure:
            {
                "aiSpecialist": { "status": "Optimized", "report": "..." },
                "aiAnalyst": { "status": "Data-Rich", "report": "..." },
                "businessAnalyst": { "status": "Profitable", "report": "..." },
                "aiPrediction": { "status": "Future-Ready", "report": "..." }
            }
        `;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const cleanJson = text.replace(/```json|```/g, "").trim();
        return JSON.parse(cleanJson);

    } catch (error) {
        console.error("Strategy Expert AI Error:", error);
        throw error;
    }
};

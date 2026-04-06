const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generates dynamic AI analysis for a turf based on its performance data
 * @param {Object} turf - The turf object from DB
 * @param {Array} recentBookings - Optional context for occupancy
 */
exports.generateTurfAnalysis = async (turf) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are an expert Sports Business & Tactical AI Analyst for "The Turf" booking platform.
      Analyze the following turf venue and provide TWO distinct perspectives:
      1. AI Tactical Analyst (Focus on player experience, play style, and timing)
      2. Business Arena Insight (Focus on demand, revenue, and occupancy)

      VENUE DATA:
      Name: ${turf.name}
      Location: ${turf.location}
      Sports: ${turf.sports.join(', ')}
      Size: ${turf.groundSize}
      Amenities: ${turf.amenities.join(', ')}
      Rating: ${turf.rating} (${turf.reviewCount} reviews)
      Pricing: Weekday Day: ${turf.pricing.weekdayDay}, Weekday Night: ${turf.pricing.weekdayNight}
      Opening: ${turf.openingHour} AM, Closing: ${turf.closingHour} PM

      REQUIREMENTS:
      - Be concise but professional.
      - Sound data-driven and futuristic.
      - Return a JSON object with this structure:
      {
        "aiAnalysis": {
          "bestTime": "Specific 3-hour window",
          "idealGroupSize": "e.g. 5 vs 5",
          "playStyle": "High-impact description of play style",
          "summary": "1-2 sentence tactical advice"
        },
        "businessAnalysis": {
          "revenueStatus": "Demand status (e.g. Peak, Growing, Steady)",
          "occupancyRate": "Estimated % based on rating/reviews",
          "matchIntensity": "e.g. Professional / Casual / Mixed",
          "summary": "1-2 sentence business insight"
        }
      }

      Return ONLY the JSON.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean JSON if Gemini adds markdown blocks
    const cleanJson = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("AI Analysis Error:", error);
    // Fallback to static data if AI fails
    return {
      aiAnalysis: turf.aiAnalysis,
      businessAnalysis: turf.businessAnalysis
    };
  }
};

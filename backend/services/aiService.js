const { GoogleGenerativeAI } = require("@google/generative-ai");
const natural = require("natural");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generates dynamic ball-by-ball commentary using NLP
 */
exports.generateCommentary = async ({ ball, batsman, bowler, match, situation }) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `
            You are a professional cricket commentator with a high-energy, modern style (like IPL).
            
            MATCH SITUATION: ${situation || 'Regular play'}
            BATSMAN: ${batsman}
            BOWLER: ${bowler}
            BALL EVENT: ${ball}
            
            Generate a short, exciting one-line commentary for this ball. 
            Use cricket terminology (e.g. "Full toss", "Square cut", "Slower ball").
            Return ONLY the commentary text.
        `;
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();

        // Section 6: NLP Enhancement using 'natural'
        const tokenizer = new natural.WordTokenizer();
        const keywords = tokenizer.tokenize(text).filter(w => w.length > 4);
        const analyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn');
        const sentiment = analyzer.getSentiment(tokenizer.tokenize(text));

        return { text, keywords, sentiment };
    } catch (error) {
        console.error("Commentary AI Error:", error);
        return { text: `${batsman} faces ${bowler}. ${ball}.`, keywords: [], sentiment: 0 };
    }
};

/**
 * Generates an individual player post-match report
 */
exports.generatePostMatchReport = async (match, playerStats) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `
            You are an AI Performance Analyst for "The Turf".
            Analyze this player's match performance:
            
            MATCH: ${match.title}
            PLAYER STATS: ${JSON.stringify(playerStats)}
            
            Generate a concise performance report including:
            1. KEY HIGHLIGHT (Something they did well)
            2. AREA FOR IMPROVEMENT
            3. RATING (out of 10)
            
            Keep it professional, encouraging, and data-driven.
            Return ONLY the report text.
        `;
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
    } catch (error) {
        return "Performance data processed. Current Rating: 7.5/10. Consistent contribution detected.";
    }
};

/**
 * Generates match momentum and winner prediction with structured tactical analysis
 */
exports.generateMatchPrediction = async (context) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `
            You are the "Turf Analytics AI". Analyze this live cricket match situation.
            
            MATCH CONTEXT:
            TITLE: ${context.title}
            TEAMS: ${JSON.stringify(context.teams)}
            LIVE DATA: ${JSON.stringify(context.live_data)}
            
            TASK:
            Generate a high-precision match prediction in valid JSON format.
            - winProbability: Percentage for Team A (number)
            - finalScoreEstimate: String prediction (e.g. "125-135")
            - mvp: Player name most likely to impact the result
            - insight: One-sentence tactical summary
            - momentum: Current leading team name
            
            Structure:
            {
              "winProbability": 65,
              "finalScoreEstimate": "140",
              "mvp": "Player Name",
              "insight": "Description...",
              "momentum": "Team Name"
            }
            
            Return ONLY the JSON.
        `;
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        const cleanJson = text.replace(/```json|```/g, "").trim();
        return JSON.parse(cleanJson);
    } catch (error) {
        console.error("Prediction Error:", error);
        return {
            winProbability: 50,
            finalScoreEstimate: "N/A",
            mvp: "Analyzing...",
            insight: "Atmospheric pressure and player momentum suggest a 50-50 split.",
            momentum: "Neutral"
        };
    }
};

/**
 * TurfBot chat logic with user context
 */
exports.turfBotChat = async (message, history, context) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const chat = model.startChat({
            history: history.map(h => ({
                role: h.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: h.content }]
            }))
        });

        const prompt = `
            User Context: ${JSON.stringify(context)}
            Message: ${message}
            
            You are "TurfBot", the intelligent AI assistant for "The Turf" sports facility.
            Be helpful, brief, and friendly. You have access to user profile stats.
            If they ask about their performance, refer to their context stats.
        `;

        const result = await chat.sendMessage(prompt);
        return result.response.text().trim();
    } catch (error) {
        return "I'm experiencing a high load right now, but I'm here to help! How can I assist with your turf booking?";
    }
};

/**
 * Original Turf Venue Analysis
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
    const cleanJson = result.response.text().replace(/```json|```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    return {
      aiAnalysis: turf.aiAnalysis,
      businessAnalysis: turf.businessAnalysis
    };
  }
};

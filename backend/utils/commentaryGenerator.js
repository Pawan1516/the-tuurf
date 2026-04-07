const AIService = require('../services/aiService');

/**
 * Auto-generate cricket commentary for each ball using AI & NLP
 */
async function generateCommentary(ballData) {
    const { runs, isWicket, wicketType, extraType, batsmanName, bowlerName, overNum, ballNum } = ballData;

    try {
        // Use the Gemini + Natural NLP service for high-quality commentary
        const aiResult = await AIService.generateCommentary(
            batsmanName, 
            bowlerName, 
            `${overNum}.${ballNum}`,
            runs,
            isWicket
        );

        // Enhance with metadata for the real-time feed
        return {
            text: `${overNum}.${ballNum} — ${aiResult.text}`,
            keywords: aiResult.keywords || [],
            sentiment: aiResult.sentiment || 0,
            isAI: true
        };
    } catch (error) {
        console.error("AI Commentary Generation Failed, using fallback.");
        const prefix = `${overNum}.${ballNum}`;
        return {
            text: `${prefix} — ${bowlerName} to ${batsmanName}. ${runs} runs.`,
            keywords: [],
            sentiment: 0,
            isAI: false
        };
    }
}

module.exports = { generateCommentary };

const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || 'dummy_key',
});

class AIService {
    /**
     * @desc Generate one-line punchy commentary for a ball
     */
    static async generateCommentary(context) {
        try {
            const { ball, batsman, bowler, match, situation } = context;
            
            const prompt = `You are a live cricket commentator for 'The Turf'. Generate ONE punchy, engaging sentence for this ball:
            EVENT: ${ball.type === 'normal' ? ball.runs + ' runs' : ball.type}
            BATSMAN: ${batsman.name} (${batsman.runs} off ${batsman.balls})
            BOWLER: ${bowler.name} (Econ: ${bowler.economy})
            MATCH STATE: ${match.team} needs ${match.required} off ${match.ballsLeft} balls.
            SITUATION: ${situation}
            
            Keep it under 60 tokens. Be dramatic if it's a high pressure situation.`;

            const message = await anthropic.messages.create({
                model: "claude-3-sonnet-20240229",
                max_tokens: 60,
                temperature: 0.8,
                system: "You are a live cricket commentator. Return only the commentary line.",
                messages: [{ role: "user", content: prompt }],
            });

            return message.content[0].text;
        } catch (error) {
            console.error('AI Commentary Error:', error);
            return "A solid delivery there."; // Fallback
        }
    }

    /**
     * @desc TurfBot - AI In-App Assistant
     */
    static async turfBotChat(userInput, conversationHistory, userContext) {
        try {
            const systemPrompt = `You are TurfBot, the cricket assistant for 'The Turf' platform. 
            You have access to the user's stats, team, and match history.
            CONTEXT: ${JSON.stringify(userContext)}
            Answer concisely and helpfully. If asked for stats, use the provided JSON context. 
            Be encouraging like a coach.`;

            const message = await anthropic.messages.create({
                model: "claude-3-sonnet-20240229",
                max_tokens: 300,
                temperature: 0.4,
                system: systemPrompt,
                messages: [
                    ...conversationHistory,
                    { role: "user", content: userInput }
                ],
            });

            return message.content[0].text;
        } catch (error) {
            console.error('TurfBot Error:', error);
            return "I'm having trouble analyzing the stats right now, but you're doing great on the field!";
        }
    }

    /**
     * @desc Generate individual post-match report
     */
    static async generatePostMatchReport(matchData, playerData) {
        try {
            const prompt = `Analyze this player's performance in MS Paint... just kidding. 
            Use this data to generate a short, professional post-match debrief.
            MATCH: ${matchData.title} (${matchData.result})
            PLAYER STATS: ${JSON.stringify(playerData)}
            Include: Performance Grade, Batting/Bowling analysis, Turning point contribution, and Focus for next match.`;

            const message = await anthropic.messages.create({
                model: "claude-3-sonnet-20240229",
                max_tokens: 500,
                temperature: 0.5,
                system: "You are a professional cricket analyst. Return a structured JSON-like text report.",
                messages: [{ role: "user", content: prompt }],
            });

            return message.content[0].text;
        } catch (error) {
            console.error('Post-Match AI Error:', error);
            return "Technical difficulties with the AI Analyst. We'll have your report shortly!";
        }
    }
}

module.exports = AIService;

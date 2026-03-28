const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


class AIService {
    static async callAI(prompt, system = "You are a professional cricket analyst.") {
        const models = [
            "gemini-3.1-flash-live-preview-preview-12-2025",
            "gemini-2.5-flash",
            "gemini-2.0-flash"
        ];
        let lastError = null;
        for (const mName of models) {
            try {
                const model = genAI.getGenerativeModel({ model: mName });
                const fullPrompt = `${system}\n\nUser: ${prompt}`;
                const result = await model.generateContent(fullPrompt);
                return result.response.text();
            } catch (err) {
                lastError = err;
                if (err.status !== 404) break;
            }
        }
        throw lastError;
    }

    static async generateCommentary(context) {
        try {
            const { ball, batsman, bowler, match, situation } = context;
            const prompt = `Generate ONE punchy, engaging sentence for this ball:
            EVENT: ${ball.type === 'normal' ? ball.runs + ' runs' : ball.type}
            BATSMAN: ${batsman.name} (${batsman.runs} off ${batsman.balls})
            BOWLER: ${bowler.name} (Econ: ${bowler.economy})
            MATCH STATE: ${match.team} needs ${match.required} off ${match.ballsLeft} balls.
            SITUATION: ${situation}`;
            return await this.callAI(prompt, "You are a live cricket commentator. Return only the commentary line.");
        } catch (error) {
            return "Solid delivery on target.";
        }
    }

    static async turfBotChat(userInput, conversationHistory, userContext) {
        try {
            const historyStr = conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n');
            const prompt = `Context: ${JSON.stringify(userContext)}\nHistory:\n${historyStr}\nUser: ${userInput}`;
            return await this.callAI(prompt, "You are TurfBot, an encouraging cricket coach assistant.");
        } catch (error) {
            return "Coach is busy - but keep training hard!";
        }
    }

    static async generatePostMatchReport(matchData, playerData) {
        try {
            const prompt = `Report for: ${matchData.title}\nStats: ${JSON.stringify(playerData)}`;
            return await this.callAI(prompt, "Professional cricket debrief analyst.");
        } catch (error) {
            return "Report sync pending.";
        }
    }

    static async generateMatchPrediction(matchData) {
        try {
            const prompt = `JSON Prediction only: ${JSON.stringify(matchData)}`;
            const resultText = await this.callAI(prompt, "Cricket prediction engine. Output JSON only: {winner, probability, reasoning}");
            try {
                return JSON.parse(resultText);
            } catch (pErr) {
                const clean = resultText.replace(/```json|```/g, "").trim();
                return JSON.parse(clean);
            }
        } catch (error) {
            return { winner: "Neutral", probability: "50%", reason: "Calculating..." };
        }
    }
}

module.exports = AIService;

const Match = require('../models/Match');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const fs = require('fs');
const path = require('path');

/**
 * AI System for The Turf
 * Uses real database data only. No external APIs.
 */

const aiService = {
    /**
     * 1. AI Specialist (Smart Assistant)
     * Answers queries based on real-time match data.
     */
    async getSpecialistInsight(question, matchId) {
        if (!matchId) return "I need a specific match context to answer that.";
        
        const match = await Match.findById(matchId);
        if (!match) return "Match data not found.";

        const query = question.toLowerCase();
        const live = match.live_data || {};

        // Question: Current Score
        if (query.includes('score') || query.includes('current')) {
            const teamA = match.team_a?.team_id?.name || "Team A";
            const teamB = match.team_b?.team_id?.name || "Team B";
            return `Current Score: ${match.live_active_team === 'B' ? teamB : teamA} is ${live.runs || 0}/${live.wickets || 0} in ${live.overs || '0.0'} overs.`;
        }

        // Question: Top Scorer
        if (query.includes('top scorer') || query.includes('highest runs') || query.includes('who is batting best')) {
            const batsmen = live.scorecard?.batsmen || [];
            if (batsmen.length === 0) return "No batting data available yet.";
            const top = [...batsmen].sort((a, b) => b.runs - a.runs)[0];
            return `The top scorer is ${top.name} with ${top.runs} runs off ${top.balls} balls (SR: ${top.sr}).`;
        }

        // Question: Best Bowler
        if (query.includes('best bowler') || query.includes('wickets')) {
            const bowlers = live.scorecard?.bowlers || [];
            if (bowlers.length === 0) return "No bowling data available yet.";
            // Sort by wickets desc, then economy asc
            const best = [...bowlers].sort((a, b) => {
                if (b.wickets !== a.wickets) return b.wickets - a.wickets;
                return parseFloat(a.eco) - parseFloat(b.eco);
            })[0];
            return `The best bowler currently is ${best.name} with figures of ${best.wickets}/${best.runs} in ${best.overs} overs (Eco: ${best.eco}).`;
        }

        return "I can answer questions about the current score, top scorers, or best bowlers. Try asking 'What is the current score?'";
    },

    /**
     * 2. AI Analyst (Match Analysis)
     * Performance calculations for current match.
     */
    async getMatchAnalysis(matchId) {
        const match = await Match.findById(matchId);
        if (!match || !match.live_data) return { error: "Match analysis data not available." };

        const live = match.live_data;
        const runs = live.runs || 0;
        const oversStr = live.overs || "0.0";
        const [ov, bl] = oversStr.split('.').map(Number);
        const totalBalls = (ov || 0) * 6 + (bl || 0);
        const oversDecimal = totalBalls / 6;

        const rr = oversDecimal > 0 ? (runs / oversDecimal).toFixed(2) : "0.00";
        
        const batsmen = live.scorecard?.batsmen || [];
        const topSR = batsmen.length > 0 ? Math.max(...batsmen.map(b => parseFloat(b.sr) || 0)).toFixed(1) : "0.0";
        
        const bowlers = live.scorecard?.bowlers || [];
        const bestEco = bowlers.length > 0 ? Math.min(...bowlers.map(bw => parseFloat(bw.eco) || 99)).toFixed(1) : "0.0";

        // Dot ball % logic (requires ball-by-ball or stored dot count)
        // Since we don't store aggregate dot count explicitly in live_data usually, 
        // we'd fetch from innings if available.
        let dotPercent = "0";
        const currentInning = match.innings?.[match.current_innings_index || 0];
        if (currentInning && currentInning.balls && currentInning.balls.length > 0) {
            const dots = currentInning.balls.filter(b => b.runs_off_bat === 0 && !b.extra_type).length;
            dotPercent = ((dots / currentInning.balls.length) * 100).toFixed(1);
        }

        return {
            runRate: rr,
            highestSR: topSR,
            bestEconomy: bestEco,
            dotBallPercentage: dotPercent,
            insights: [
                `Run Rate is currently ${rr} runs per over.`,
                `Aggressive batting seen with top SR of ${topSR}.`,
                `Bowlers maintaining pressure with ${dotPercent}% dot balls.`
            ]
        };
    },

    /**
     * 3. AI Prediction (Real Logic)
     * Win probability based on match state.
     */
    async getWinPrediction(matchId) {
        const match = await Match.findById(matchId);
        if (!match || match.status === 'Completed') return { status: "Match Over" };

        const live = match.live_data || {};
        const runs = live.runs || 0;
        const wickets = live.wickets || 0;
        const target = live.target || 0;
        const overs = live.overs || "0.0";
        const [ov, bl] = overs.split('.').map(Number);
        const ballsDone = (ov || 0) * 6 + (bl || 0);
        const totalBalls = (match.overs || 20) * 6;
        const ballsLeft = totalBalls - ballsDone;

        if (target === 0) {
            // First Innings Prediction
            // Base prob 50%, adjusted by RR and wickets
            const projected = ballsDone > 0 ? (runs / ballsDone) * totalBalls : 0;
            let prob = 50 + (projected > 160 ? 10 : -5) - (wickets * 5);
            prob = Math.max(10, Math.min(90, prob));
            
            return {
                teamA_prob: prob.toFixed(0),
                teamB_prob: (100 - prob).toFixed(0),
                projectedScore: Math.round(projected),
                insight: `Projected score: ${Math.round(projected)}. ${wickets} wickets lost affects momentum.`
            };
        } else {
            // Second Innings Prediction
            const reqRuns = target - runs;
            const rrr = ballsLeft > 0 ? (reqRuns / (ballsLeft / 6)).toFixed(2) : "0.00";
            const crr = ballsDone > 0 ? (runs / (ballsDone / 6)) : 0;
            const projected = crr * (totalBalls / 6); // Just for trend
            
            // Formula: (current_runs / target) * 100 - (wickets_lost * 5)
            let teamB_prob = (runs / target) * 100 - (wickets * 8); // Chasing team
            
            // Adjust for RRR vs CRR
            if (parseFloat(rrr) > crr + 2) teamB_prob -= 15;
            
            teamB_prob = Math.max(5, Math.min(95, teamB_prob));
            
            return {
                teamA_prob: (100 - teamB_prob).toFixed(0),
                teamB_prob: teamB_prob.toFixed(0),
                projectedScore: Math.round(projected),
                rrr: rrr,
                runsNeeded: reqRuns,
                ballsLeft: ballsLeft,
                insight: `Need ${reqRuns} in ${ballsLeft} balls. RRR is ${rrr}.`
            };
        }
    },

    /**
     * 3b. Advanced AI Models (Blueprints)
     * Placeholders for XGBoost/LSTM integration
     */
    async getPlayerPerformance(playerId, matchId) {
        // Blueprint for Model: Player Impact Score
        return { impactScore: 75, recommendation: "Maintain aggressive strike rotation." };
    },

    async getCollapseWarning(matchId) {
        // Blueprint for Model: Batting Collapse Detection
        return { risk: "Low", threshold: 15 };
    },


    /**
     * 4. Business Analyst (Real Data)
     * Revenue and booking trends.
     */
    async getBusinessInsights() {
        const bookings = await Booking.find({ paymentStatus: 'verified' });
        
        const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalAmount || b.amount || 0), 0);
        
        // Peak Time Calculation
        const timeMap = {};
        bookings.forEach(b => {
            if (b.timeSlot) {
                timeMap[b.timeSlot] = (timeMap[b.timeSlot] || 0) + 1;
            }
        });
        const peakTime = Object.entries(timeMap).sort((a,b) => b[1] - a[1])[0]?.[0] || "N/A";

        // Popular Turf
        const turfMap = {};
        bookings.forEach(b => {
            if (b.turfLocation) {
                turfMap[b.turfLocation] = (turfMap[b.turfLocation] || 0) + 1;
            }
        });
        const popularTurf = Object.entries(turfMap).sort((a,b) => b[1] - a[1])[0]?.[0] || "N/A";

        // Revenue this week vs last week
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

        const thisWeekRevenue = bookings
            .filter(b => b.createdAt >= oneWeekAgo)
            .reduce((sum, b) => sum + (b.totalAmount || b.amount || 0), 0);
            
        const lastWeekRevenue = bookings
            .filter(b => b.createdAt >= twoWeeksAgo && b.createdAt < oneWeekAgo)
            .reduce((sum, b) => sum + (b.totalAmount || b.amount || 0), 0);

        const growth = lastWeekRevenue > 0 ? (((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100).toFixed(1) : "100";

        return {
            totalRevenue,
            peakTime,
            popularTurf,
            weeklyGrowth: growth,
            insights: [
                `Total verified revenue: ₹${totalRevenue.toLocaleString()}`,
                `Peak booking hours: ${peakTime}`,
                `Most popular location: ${popularTurf}`,
                `Revenue ${growth > 0 ? 'increased' : 'decreased'} by ${Math.abs(growth)}% this week.`
            ]
        };
    },

    /**
     * 5. Strategy Recommendations
     * Produce simple, actionable business & match strategies from current data.
     */
    async getStrategyRecommendations(matchId) {
        const business = await this.getBusinessInsights();
        let matchAnalysis = null;
        let prediction = null;
        if (matchId) {
            try {
                matchAnalysis = await this.getMatchAnalysis(matchId);
                prediction = await this.getWinPrediction(matchId);
            } catch (e) {
                // ignore per-match failures
            }
        }

        const recs = [];

        // Business-focused recommendations
        if (business.peakTime && business.peakTime !== 'N/A') {
            recs.push(`Run targeted promotions and discounted add-ons around ${business.peakTime} to capture peak demand.`);
        } else {
            recs.push('Promote off-peak slots with bundled offers to increase utilization.');
        }

        if (business.popularTurf && business.popularTurf !== 'N/A') {
            recs.push(`Highlight ${business.popularTurf} in marketing and maintain pricing parity across other turfs.`);
        }

        if (business.weeklyGrowth && !isNaN(parseFloat(business.weeklyGrowth))) {
            const g = parseFloat(business.weeklyGrowth);
            if (g > 10) recs.push('Leverage momentum with referral incentives to sustain growth.');
            else if (g > 0) recs.push('Increase targeted retargeting ads to convert marginal visitors.');
            else recs.push('Investigate drop causes: pricing, availability, or UX friction; run quick A/B tests.');
        }

        // Match / on-field recommendations
        if (matchAnalysis && matchAnalysis.runRate) {
            recs.push(`Monitor run rate (${matchAnalysis.runRate}). If run rate drops, consider short coaching clinics or in-game engagement to retain spectators.`);
        }

        if (prediction && prediction.insight) {
            recs.push(`Match insight: ${prediction.insight}`);
        }

        // Cross-sell / ops suggestions
        recs.push('Offer last-minute booking discounts for canceled slots and automated notifications to waitlisted users.');
        recs.push('Bundle refreshments and equipment rentals during peak hours to increase ARPU.');

        const summary = `Recommendations generated using live booking and match telemetry. Key focus: drive bookings at peak time (${business.peakTime || 'unknown'}), convert growth into referrals, and optimize on-field engagement.`;

        return { summary, recommendations: recs };
    },

    /**
     * 6. Perspective Node
     * Lightweight snapshot combining specialist, analyst, prediction and business view
     */
    async getPerspectiveNode(matchId) {
        const business = await this.getBusinessInsights();
        let specialist = null;
        let analyst = null;
        let prediction = null;

        if (matchId) {
            try {
                specialist = {
                    currentScore: await this.getSpecialistInsight('What is the current score?', matchId),
                    topScorer: await this.getSpecialistInsight('Who is the top scorer?', matchId)
                };
            } catch (e) {
                specialist = { error: 'Specialist data unavailable' };
            }

            try {
                analyst = await this.getMatchAnalysis(matchId);
            } catch (e) {
                analyst = { error: 'Analyst data unavailable' };
            }

            try {
                prediction = await this.getWinPrediction(matchId);
            } catch (e) {
                prediction = { error: 'Prediction data unavailable' };
            }
        }

        return {
            generatedAt: new Date().toISOString(),
            businessAnalyst: business,
            aiSpecialist: specialist,
            aiAnalyst: analyst,
            aiPrediction: prediction
        };
    },

    /**
     * 7. Intelligence Node
     * Produces prioritized, actionable intelligence derived from perspective + strategy
     */
    async getIntelligenceNode(matchId) {
        const perspective = await this.getPerspectiveNode(matchId);
        const strategy = await this.getStrategyRecommendations(matchId);

        // Generate a compact summary
        const parts = [];
        if (perspective.aiSpecialist && perspective.aiSpecialist.currentScore) parts.push(perspective.aiSpecialist.currentScore);
        if (perspective.businessAnalyst && perspective.businessAnalyst.insights) parts.push(perspective.businessAnalyst.insights[0]);
        if (strategy && strategy.summary) parts.push(strategy.summary);

        // Prioritize recommendations heuristically
        const prioritized = (strategy.recommendations || []).map((r, idx) => {
            let score = 50 - idx * 5;
            if (r.toLowerCase().includes('peak')) score += 20;
            if (r.toLowerCase().includes('referral')) score += 10;
            if (r.toLowerCase().includes('discount')) score += 5;
            return { text: r, priority: Math.min(100, Math.max(1, score)) };
        }).sort((a,b) => b.priority - a.priority);

        const intelligence = {
            summary: parts.join(' \n'),
            generatedAt: new Date().toISOString(),
            prioritizedRecommendations: prioritized,
            raw: {
                perspective,
                strategy
            }
        };

        return intelligence;
    }
};

module.exports = aiService;

// Backward-compatible alias used by some routes
aiService.getAIInsights = async function(stats) {
    try {
        // If stats provided, include them in the quick summary
        const intelligence = await this.getIntelligenceNode(null);
        return {
            summary: intelligence.summary || 'AI intelligence generated.',
            stats: stats || null,
            intelligence
        };
    } catch (err) {
        return { summary: 'AI subsystem unavailable', error: err.message };
    }
};

// Readable master prompt accessor
aiService.getMasterPrompt = async function() {
    return await aiService.getMasterPromptByName('strategy-hub');
};

aiService.getMasterPromptByName = async function(name) {
    try {
        const allowed = {
            'strategy-hub': 'STRATEGY_HUB_MASTER_PROMPT.md',
            'ai-agent': 'AI_AGENT_MASTER_PROMPT.md'
        ,
            'enterprise-ai': 'ENTERPRISE_AI_MASTER_PROMPT.md'
        };
        const file = allowed[name] || allowed['strategy-hub'];
        const p = path.join(__dirname, '..', 'ai', 'prompts', file);
        const content = await fs.promises.readFile(p, 'utf8');
        return content;
    } catch (err) {
        console.error('Failed to read master prompt:', err.message);
        return null;
    }
};

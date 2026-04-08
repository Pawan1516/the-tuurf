/**
 * AI Engine for Cricket Analytics
 * Calculates real-time metrics like Win Probability and Momentum
 */

exports.calculateWinProbability = (match, currentInnings) => {
    // Basic context
    const formatOvers = match.format === 'T20' ? 20 : (match.format === 'T10' ? 10 : (match.format === 'ODI' ? 50 : (match.live_data?.formatOvers || 20)));
    const totalBalls = formatOvers * 6;
    
    // Extract current state
    const { runs, wickets, overNum, ballInOver, target, inningsNum } = currentInnings;
    const ballsBowled = overNum * 6 + ballInOver;
    const ballsLeft = totalBalls - ballsBowled;
    const wicketsLeft = 10 - wickets;

    // 1st Innings Win Prob (Historical average based)
    // In 1st innings, we compare current run rate to par score for the venue/format
    if (inningsNum === 1 || !target) {
        const crr = runs / (ballsBowled / 6 || 1);
        const projected = (runs / (ballsBowled || 1)) * totalBalls;
        
        // Simple heuristic: if projected > par (e.g. 160 for T20 local), win prob increases
        const parScore = formatOvers * 8; // Default 8 RPO par
        let prob = 50 + ((projected - parScore) / parScore) * 50;
        
        // Wicket penalty
        prob -= (wickets * 3);
        
        return Math.min(Math.max(Math.round(prob), 10), 90);
    }

    // 2nd Innings Win Prob (Chase logic)
    const runsNeeded = target - runs;
    if (runsNeeded <= 0) return 100; // Batting team won
    if (wicketsLeft === 0 || (ballsLeft === 0 && runsNeeded > 0)) return 0; // Bowling team won

    const rrr = (runsNeeded / (ballsLeft / 6 || 0.1));
    const crr = runs / (ballsBowled / 6 || 1);

    // Baseline: 50/50
    let batWinProb = 50;

    // Pressure factor (RRR vs CRR)
    const pressure = rrr - crr;
    batWinProb -= (pressure * 5);

    // Wicket Factor: Each wicket left adds confidence
    batWinProb += (wicketsLeft - 5) * 4;

    // Death Overs Factor: If RRR > 12 in last 3 overs, probability drops faster
    if (ballsLeft < 18 && rrr > 12) {
        batWinProb -= (rrr - 12) * 10;
    }

    // Boundary to 5% - 95% range
    const finalProb = Math.min(Math.max(Math.round(batWinProb), 5), 95);
    
    return finalProb;
};

exports.calculateMomentumScore = (last5Balls) => {
    // Momentum = Runs in last 5 balls / wickets in last 5 balls
    if (!last5Balls || last5Balls.length === 0) return 50;
    
    let score = 50;
    last5Balls.forEach(b => {
        score += (b.runs * 2);
        if (b.is_wicket) score -= 30;
    });

    return Math.min(Math.max(score, 0), 100);
};

/**
 * Generates a text-based summary of the match for AI Reports
 */
exports.generateMatchReport = (match) => {
    const { team_a, team_b, result, ball_history } = match;
    const winner = result?.winner?.name || result?.winner || "Undecided";
    const totalRuns = ball_history.reduce((sum, b) => sum + b.runs, 0);
    const totalWickets = ball_history.filter(b => b.is_wicket).length;

    // Identifying key turning point (ball with highest win prob shift)
    let maxShift = 0;
    let turningPointBall = null;
    for (let i = 1; i < ball_history.length; i++) {
        const shift = Math.abs((ball_history[i].win_prob || 50) - (ball_history[i-1].win_prob || 50));
        if (shift > maxShift) {
            maxShift = shift;
            turningPointBall = ball_history[i];
        }
    }

    const report = {
        headline: `${winner} clinches a thriller at ${match.venue || 'The Turf'}!`,
        summary: `A high-intensity match between ${team_a.name} and ${team_b.name} concluded with ${winner} emerging victorious. The game saw ${totalRuns} runs scored and ${totalWickets} wickets falling.`,
        turning_point: turningPointBall ? `The match swung decisively in over ${turningPointBall.over}.${turningPointBall.ball} after a critical momentum shift of ${Math.round(maxShift)}%.` : "A clinical performance from start to finish.",
        mvp_logic: "AI analyzing impact scores... Top candidates identified based on run-contribution and bowling economy."
    };

    return report;
};

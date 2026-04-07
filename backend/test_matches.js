const mongoose = require('mongoose');
const Match = require('./models/Match');
const User = require('./models/User');

async function testMatchHistory() {
    await mongoose.connect('mongodb+srv://pvan_db_user:23951A66c0@cluster0.itzk1ia.mongodb.net/the-turf?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true });
    
    // Find a user who played matches
    const user = await User.findOne({ name: 'Pavan' }) || await User.findOne();
    if (!user) { console.log('No user'); process.exit(0); }
    
    const userId = user._id;
    const userName = user?.name?.toLowerCase();

    const matches = await Match.find({
        $or: [
            { 'team_a.squad': userId },
            { 'team_b.squad': userId },
            { 'quick_teams.team_a.players.user_id': userId },
            { 'quick_teams.team_b.players.user_id': userId },
            { 'innings.batsmen.name': { $regex: new RegExp(`^${user?.name}$`, 'i') } },
            { 'innings.bowlers.name': { $regex: new RegExp(`^${user?.name}$`, 'i') } }
        ],
        status: 'Completed'
    }).sort({ createdAt: -1 }).limit(5).lean();

    const history = matches.map(match => {
        let battingStats = { runs: 0, balls: 0, fours: 0, sixes: 0, dots: 0, isOut: false };
        let bowlingStats = { wickets: 0, runs: 0, overs: 0, economy: 0 };

        const resolveUserId = (id) => {
            if (!id) return null;
            const sid = String(id);
            if (match.quick_teams) {
                for (const teamKey of ['team_a', 'team_b']) {
                    const players = match.quick_teams[teamKey]?.players || [];
                    const p = players.find(x => String(x._id) === sid);
                    if (p && p.user_id) return String(p.user_id);
                }
            }
            for (const teamKey of ['team_a', 'team_b']) {
                const players = match[teamKey]?.squad || [];
                const p = players.find(x => String(x._id) === sid || String(x.user_id) === sid);
                if (p && p.user_id) return String(p.user_id);
            }
            return sid;
        };

        const targetUserIdStr = userId.toString();

        match.innings.forEach(inning => {
            // 1. Ball-by-ball extraction (Highest accuracy)
            if (inning.balls && inning.balls.length > 0) {
                const myBattingBalls = inning.balls.filter(b => 
                    resolveUserId(b.batter_id) === targetUserIdStr || 
                    b.batter_name?.toLowerCase() === userName
                );
                if (myBattingBalls.length > 0) {
                    battingStats.balls += myBattingBalls.length;
                    battingStats.runs += myBattingBalls.reduce((sum, b) => sum + (b.runs_off_bat || 0), 0);
                    battingStats.fours += myBattingBalls.filter(b => b.is_four || b.runs_off_bat === 4).length;
                    battingStats.sixes += myBattingBalls.filter(b => b.is_six || b.runs_off_bat === 6).length;
                    battingStats.dots += myBattingBalls.filter(b => (b.runs_off_bat === 0 && !b.extra_type)).length;
                }

                const myBowlingBalls = inning.balls.filter(b => 
                    resolveUserId(b.bowler_id) === targetUserIdStr || 
                    b.bowler_name?.toLowerCase() === userName
                );
                if (myBowlingBalls.length > 0) {
                    const totalRuns = myBowlingBalls.reduce((sum, b) => {
                        const r = (Number(b.runs_off_bat) || 0) + (Number(b.extra_runs) || 0);
                        if (b.extra_type === 'bye' || b.extra_type === 'legbye') {
                            return sum + (Number(b.extra_runs) || 0);
                        }
                        return sum + r;
                    }, 0);
                    
                    let runsConceded = 0;
                    myBowlingBalls.forEach(b => {
                        if (b.extra_type !== 'bye' && b.extra_type !== 'legbye') {
                             runsConceded += (Number(b.runs_off_bat) || 0) + (Number(b.extra_runs) || 0);
                        }
                    });

                    const validBalls = myBowlingBalls.filter(b => b.extra_type !== 'wide' && b.extra_type !== 'noball').length;
                    bowlingStats.runs += runsConceded;
                    bowlingStats.wickets += myBowlingBalls.filter(b => b.is_wicket && b.wicket?.is_bowler_wicket).length;
                    
                    const existingBalls = Math.floor(bowlingStats.overs) * 6 + Math.round((bowlingStats.overs % 1) * 10);
                    const newTotalBalls = existingBalls + validBalls;
                    bowlingStats.overs = Number((Math.floor(newTotalBalls / 6) + (newTotalBalls % 6) / 10).toFixed(1));
                    bowlingStats.economy = bowlingStats.overs > 0 ? (bowlingStats.runs / (newTotalBalls / 6)).toFixed(2) : 0;
                }
            }

            // 2. Scorecard fallback
            const bat = (inning.batsmen || []).find(b => 
                resolveUserId(b.user_id) === targetUserIdStr ||
                (b.user_id && String(b.user_id) === targetUserIdStr) || 
                (b.name && b.name.toLowerCase() === userName)
            );
            if (bat && (battingStats.runs === 0 && battingStats.balls === 0)) {
                battingStats.runs = bat.runs || 0;
                battingStats.balls = bat.balls || 0;
                battingStats.fours = bat.fours || 0;
                battingStats.sixes = bat.sixes || 0;
                battingStats.dots = Math.round((bat.balls || 0) * 0.3);
            }

            const bowl = (inning.bowlers || []).find(b => 
                resolveUserId(b.user_id) === targetUserIdStr ||
                (b.user_id && String(b.user_id) === targetUserIdStr) || 
                (b.name && b.name.toLowerCase() === userName)
            );
            if (bowl && (bowlingStats.wickets === 0 && bowlingStats.overs === 0)) {
                bowlingStats.wickets = bowl.wickets || 0;
                bowlingStats.runs = bowl.runs || 0;
                bowlingStats.overs = bowl.overs || 0;
                bowlingStats.economy = bowl.overs > 0 ? (bowl.runs / bowl.overs).toFixed(2) : 0;
            }
            if (bat) battingStats.isOut = bat.out_type !== 'Not Out';
        });

        return {
            matchId: match._id,
            title: match.title,
            date: match.createdAt,
            batting: battingStats,
            bowling: bowlingStats
        };
    }).reverse();

    console.log(JSON.stringify(history, null, 2));

    process.exit(0);
}
testMatchHistory();

const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });
const Match = require('../models/Match');

async function viewMatch() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        
        const match = await Match.findOne().sort({ updatedAt: -1 });
        if (!match) {
            console.log('No matches found');
            return;
        }
        console.log('MATCH_ID:', match._id);
        console.log('TITLE:', match.title);
        console.log('STATUS:', match.status);
        console.log('MATCH_MODE:', match.match_mode);
        console.log('TEAM_A SQUAD:', match.team_a?.squad);
        console.log('TEAM_B SQUAD:', match.team_b?.squad);
        console.log('QUICK_TEAMS A PLAYERS:', match.quick_teams?.team_a?.players);
        console.log('QUICK_TEAMS B PLAYERS:', match.quick_teams?.team_b?.players);
        console.log('LIVE DATA:', JSON.stringify(match.live_data, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

viewMatch();

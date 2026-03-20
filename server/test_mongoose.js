const mongoose = require('mongoose');
require('dotenv').config();
const Match = require('./models/Match');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    try {
        const team_a = { name: "A", players: [{ input: "9963080352", input_type: "MOBILE", display_name: "Pawan", role: "Batsman", batting_position: 1 }] };
        const team_b = { name: "B", players: [{ input: "Player 1", input_type: "NAME", display_name: "Player 1", role: "Batsman", batting_position: 1 }] };

        const match = new Match({
            title: `${team_a.name} vs ${team_b.name} — Quick Match`,
            match_mode: 'QUICK',
            format: 'T10',
            start_time: new Date(),
            quick_teams: { 
                team_a: { name: team_a.name, players: team_a.players }, 
                team_b: { name: team_b.name, players: team_b.players } 
            },
            status: 'Scheduled',
            match_creation: { created_via: 'DIRECT' }
        });

        match.verification.qr_code.code = "12345ABCDE";
        match.verification.qr_code.qr_image = "abc";
        match.verification.qr_code.generated_at = new Date();
        match.verification.qr_code.expires_at = new Date();
        match.verification.verification_token = "tok";

        await match.save();
        console.log('Saved successfully!');
    } catch (e) {
        console.error('Save error:', e.message, e.errors);
    }
    process.exit(0);
});

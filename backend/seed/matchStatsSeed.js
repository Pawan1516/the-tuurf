const mongoose = require('mongoose');
const User = require('../models/User');
const Match = require('../models/Match');
const Team = require('../models/Team');
const StatsService = require('../services/statsService');
require('dotenv').config();

const playersBatch = [
    { name: 'Rahul Sharma', phone: '9876543210', role: 'PLAYER' },
    { name: 'Amit Patel', phone: '8765432109', role: 'PLAYER' },
    { name: 'Ravi Kumar', phone: '7654321098', role: 'PLAYER' },
    { name: 'Suresh Menon', phone: '6543210987', role: 'PLAYER' },
    { name: 'Priya Nair', phone: '5432109876', role: 'PLAYER' },
    { name: 'Virat K.', phone: '9000000001', role: 'PLAYER' },
    { name: 'MS Dhoni', phone: '9000000002', role: 'PLAYER' },
    { name: 'Rohit S.', phone: '9000000003', role: 'PLAYER' },
    { name: 'Jasprit B.', phone: '9000000004', role: 'PLAYER' },
    { name: 'Hardik P.', phone: '9000000005', role: 'PLAYER' }
];

const seedMatchesWithStats = async () => {
    try {
        console.log('⏳ Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        
        console.log('🧹 Cleaning existing users and matches...');
        const userRes = await User.deleteMany({ phone: { $in: playersBatch.map(p => p.phone) } });
        const matchRes = await Match.deleteMany({ title: /Seed Match/ });
        const teamRes = await Team.deleteMany({ name: /Seed Team/ });
        console.log(`🗑️ Deleted: ${userRes.deletedCount} users, ${matchRes.deletedCount} matches, ${teamRes.deletedCount} teams.`);

        console.log('👤 Creating Players...');
        const users = await User.insertMany(playersBatch.map(p => ({
            name: p.name,
            phone: p.phone,
            role: p.role,
            password: 'player@123', // Required field
            cricket_profile: {
                batting_style: Math.random() > 0.5 ? 'Right-hand bat' : 'Left-hand bat',
                bowling_style: 'Right-arm fast',
                primary_role: 'All-rounder'
            }
        })));

        console.log('🏏 Creating Seed Teams...');
        const teamA = await Team.create({ 
            name: 'Seed Team Alpha', 
            short_name: 'ALPHA',
            leader_id: users[0]._id, 
            members: users.slice(0, 5).map(u => ({ user_id: u._id, role: 'PLAYER', status: 'ACTIVE' })) 
        });
        const teamB = await Team.create({ 
            name: 'Seed Team Beta', 
            short_name: 'BETA',
            leader_id: users[5]._id, 
            members: users.slice(5, 10).map(u => ({ user_id: u._id, role: 'PLAYER', status: 'ACTIVE' })) 
        });

        console.log('📅 Generating Seed Match 1 (Verified)...');
        const match1 = new Match({
            title: 'Seed Match: Alpha vs Beta',
            format: 'T10',
            start_time: new Date(),
            team_a: { team_id: teamA._id, squad: users.slice(0, 5).map(u => u._id) },
            team_b: { team_id: teamB._id, squad: users.slice(5, 10).map(u => u._id) },
            verification: { status: 'VERIFIED' },
            status: 'Completed',
            result: { winner: teamA._id, won_by: 'Runs', margin: 15 },
            innings: [
                {
                    number: 1,
                    batting_team: teamA._id,
                    bowling_team: teamB._id,
                    balls: [
                        { batsman_id: users[0]._id, bowler_id: users[5]._id, delivery: { runs: 4, is_wicket: false, extras: { type: null, runs: 0 } } },
                        { batsman_id: users[0]._id, bowler_id: users[5]._id, delivery: { runs: 6, is_wicket: false, extras: { type: null, runs: 0 } } },
                        { batsman_id: users[0]._id, bowler_id: users[5]._id, delivery: { runs: 0, is_wicket: true, wicket: { type: 'bowled', player_out: users[0]._id }, extras: { type: null, runs: 0 } } },
                        { batsman_id: users[1]._id, bowler_id: users[5]._id, delivery: { runs: 1, is_wicket: false, extras: { type: null, runs: 0 } } }
                    ],
                    batsmen: [
                        { user_id: users[0]._id, runs: 10, balls: 3, fours: 1, sixes: 1, out_type: 'Bowled' },
                        { user_id: users[1]._id, runs: 1, balls: 1, fours: 0, sixes: 0, out_type: 'Not Out' }
                    ],
                    bowlers: [
                        { user_id: users[5]._id, overs: 0.4, runs: 11, wickets: 1 }
                    ]
                }
            ]
        });

        await match1.save();
        console.log('✅ Match 1 Created. Triggering Stats Update...');
        await StatsService.updateCareerStats(match1);

        console.log('🚀 Seeding verified match data complete! Leaderboards should now have entries.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', JSON.stringify(err, null, 2));
        process.exit(1);
    }
};

seedMatchesWithStats();

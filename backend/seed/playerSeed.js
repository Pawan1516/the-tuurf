const mongoose = require('mongoose');
const User = require('../models/User');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced', 'pro'];
const ROLES = ['Batsman', 'Bowler', 'All-Rounder', 'Wicket-Keeper'];
const CITIES = ['Hyderabad', 'Secunderabad', 'Cyberabad'];

const NAMES = [
    'Arjun Reddy', 'Sai Kiran', 'Vikram Singh', 'Rohan Mehta', 'Aditya Verma',
    'Ishaan Sharma', 'Varun Tej', 'Siddharth Rao', 'Karthik Aryan', 'Pranav Kumar',
    'Deepak Reddy', 'Manoj Kumar', 'Srinivas Rao', 'Gautam Gambhir', 'Yuvraj Singh',
    'Mahendra Singh', 'Sourav Ganguly', 'Sachin Ramesh', 'Rahul Dravid', 'Virender Sehwag',
    'Zaheer Khan', 'Anil Kumble', 'Harbhajan Singh', 'Javagal Srinath', 'Ashish Nehra',
    'Abhishek Sharma', 'Prithvi Shaw', 'Shubman Gill', 'Rishabh Pant', 'Hardik Pandya',
    'Krunal Pandya', 'Deepak Chahar', 'Rahul Chahar', 'Shardul Thakur', 'Washington Sundar'
];

async function seedPlayers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, { family: 4 });
        console.log('✅ Connected to MongoDB');

        const players = [];
        for (let i = 0; i < NAMES.length; i++) {
            const name = NAMES[i];
            const email = `${name.toLowerCase().replace(' ', '.')}@example.com`;
            
            const exists = await User.findOne({ email });
            if (exists) {
                console.log(`⏭️  Skipped: ${name}`);
                continue;
            }

            const skill = SKILL_LEVELS[Math.floor(Math.random() * SKILL_LEVELS.length)];
            const role = ROLES[Math.floor(Math.random() * ROLES.length)];
            const city = CITIES[Math.floor(Math.random() * CITIES.length)];

            players.push({
                name,
                email,
                password: 'player@123',
                phone: `91${Math.floor(1000000000 + Math.random() * 9000000000)}`,
                city,
                role: 'user',
                cricket_profile: {
                    skill_level: skill,
                    preferred_role: role,
                    batting_style: Math.random() > 0.8 ? 'Left-hand' : 'Right-hand',
                    bowling_style: role === 'Bowler' || role === 'All-Rounder' ? 'Right-arm Fast' : 'Off-break'
                },
                stats: {
                    matches: Math.floor(Math.random() * 50),
                    runs: Math.floor(Math.random() * 1000),
                    wickets: Math.floor(Math.random() * 100),
                    highScore: Math.floor(Math.random() * 100),
                    bestBowling: {
                        w: Math.floor(Math.random() * 5),
                        r: Math.floor(Math.random() * 40)
                    }
                },
                lastActive: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString()
            });
        }

        if (players.length > 0) {
            await User.insertMany(players);
            console.log(`✅ Seeded ${players.length} players!`);
        } else {
            console.log('ℹ️ No new players to seed.');
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err.message);
        process.exit(1);
    }
}

seedPlayers();

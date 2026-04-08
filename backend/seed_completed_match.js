const mongoose = require('mongoose');
const Match = require('./models/Match');
require('dotenv').config();

async function seedMatch() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Create a sample completed match
  const match = new Match({
    title: 'Miyapur Elite Battle',
    venue: 'Miyapur Main Arena',
    start_time: new Date(Date.now() - 7200000), // 2 hours ago
    end_time: new Date(),
    format: 'T3',
    status: 'Completed',
    match_mode: 'QUICK',
    team_a: {
      team_name: 'Strikers XI',
      score: 57,
      wickets: 1,
      overs_played: 3.0
    },
    team_b: {
      team_name: 'Titans XI',
      score: 11,
      wickets: 1,
      overs_played: 1.2
    },
    live_data: {
      result: 'Strikers XI won by 46 runs',
      batting_team: 'B'
    },
    quick_teams: {
        team_a: { name: 'STRIKERS XI' },
        team_b: { name: 'TITANS XI' }
    },
    verification: {
        qr_code: {
            code: 'SEED_' + Date.now(),
            qr_image: 'placeholder'
        },
        status: 'VERIFIED'
    }
  });

  await match.save();
  console.log('Sample completed match seeded successfully.');
  process.exit(0);
}

seedMatch().catch(err => {
  console.error('Seed Error:', err);
  process.exit(1);
});

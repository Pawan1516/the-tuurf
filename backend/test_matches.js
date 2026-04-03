require('dotenv').config();
const mongoose = require('mongoose');
const Match = require('./models/Match');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const matches = await Match.find({ status: 'In Progress' });
    console.log(`Found ${matches.length} active matches.`);
    matches.forEach(m => {
        console.log(`------`);
        console.log(`Match ${m._id} - ${m.title}`);
        console.log(`live_data.runs =>`, m.live_data?.runs);
        console.log(`live_data.scorecard.total.runs =>`, m.live_data?.scorecard?.total?.runs);
        console.log(`team_a.score =>`, m.team_a?.score);
        console.log(`team_b.score =>`, m.team_b?.score);
    });
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();

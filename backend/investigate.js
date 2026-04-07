const mongoose = require('mongoose');
require('dotenv').config();
const Match = require('./models/Match');

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const matches = await Match.find().sort({ updatedAt: -1 }).limit(10);
    
    for (let m of matches) {
      const ballSum = (m.innings[0]?.balls || []).reduce((acc, b) => acc + (b.runs_off_bat || 0) + (b.extra_runs || 0), 0);
      console.log(`[${m.status}] ID: ${m._id.toString().slice(-6)} | Real Score: ${m.live_data?.runs} | Ball Sum: ${ballSum} | Balls: ${m.innings[0]?.balls?.length}`);
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();

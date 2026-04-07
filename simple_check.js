const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });
const Match = require('./backend/models/Match');

async function check() {
  try {
    console.log("URI:", process.env.MONGODB_URI ? "Found" : "Missing");
    await mongoose.connect(process.env.MONGODB_URI);
    const count = await Match.countDocuments();
    console.log("Total Matches:", count);
    
    const recent = await Match.findOne().sort({ updatedAt: -1 });
    if (recent) {
        console.log("Recent ID:", recent._id);
        console.log("Live Score:", recent.live_data?.runs);
        console.log("Balls Array Sum:", (recent.innings[0]?.balls || []).reduce((acc,b) => acc + (b.runs_off_bat||0) + (b.extra_runs||0), 0));
    }
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();

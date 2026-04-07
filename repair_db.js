const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });
const Match = require('./backend/models/Match');

async function repair() {
  try {
    console.log("Starting Database Repair & Sync...");
    await mongoose.connect(process.env.MONGODB_URI);
    
    const matches = await Match.find({ status: { $in: ['In Progress', 'Completed'] } });
    console.log(`Found ${matches.length} matches to check.`);

    for (let m of matches) {
      let changed = false;
      
      for (let inn of m.innings) {
        const ballTotal = (inn.balls || []).reduce((acc, b) => acc + (b.runs_off_bat || 0) + (b.extra_runs || 0), 0);
        const wicketTotal = (inn.balls || []).filter(b => b.is_wicket).length;
        
        if (inn.score !== ballTotal || inn.wickets !== wicketTotal) {
          console.log(`Match ${m._id.toString().slice(-6)}: Correction needed. Score ${inn.score}->${ballTotal}, Wickets ${inn.wickets}->${wicketTotal}`);
          inn.score = ballTotal;
          inn.wickets = wicketTotal;
          changed = true;
        }
      }

      if (changed) {
          // Sync live_data too
          const currentInn = m.innings[m.current_innings_index || 0];
          if (currentInn) {
              m.live_data.runs = currentInn.score;
              m.live_data.wickets = currentInn.wickets;
          }
          m.markModified('innings');
          m.markModified('live_data');
          await m.save();
          console.log(`✅ Match ${m._id.toString().slice(-6)} repaired.`);
      }
    }

    console.log("Repair Complete.");
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

repair();

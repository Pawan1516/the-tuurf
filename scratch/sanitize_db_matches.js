const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });
const Match = require('../backend/models/Match');

const getValidObjectId = (id) => {
  if (!id) return null;
  const strId = String(id);
  if (mongoose.Types.ObjectId.isValid(strId)) {
    return new mongoose.Types.ObjectId(strId);
  }
  return null;
};

async function sanitizeMatches() {
  try {
    console.log('Connecting with 60s timeout...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 60000,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 60000
    });
    console.log('✅ Connected to MongoDB');

    const matches = await Match.find({});
    console.log(`Found ${matches.length} matches to sanitize.`);

    for (let match of matches) {
      let isModified = false;

      // 2. Sanitize innings
      if (match.innings && Array.isArray(match.innings)) {
        match.innings.forEach((inn, innIdx) => {
          // A. Batsmen
          if (inn.batsmen && Array.isArray(inn.batsmen)) {
            inn.batsmen.forEach((b) => {
              const validId = getValidObjectId(b.user_id);
              if (String(b.user_id) !== String(validId)) {
                console.log(`Match ${match._id}: Innings ${innIdx} batsman ${b.name} user_id invalid: ${b.user_id} -> ${validId}`);
                b.user_id = validId;
                isModified = true;
              }
            });
          }

          // B. Bowlers
          if (inn.bowlers && Array.isArray(inn.bowlers)) {
            inn.bowlers.forEach((bw) => {
              const validId = getValidObjectId(bw.user_id);
              if (String(bw.user_id) !== String(validId)) {
                console.log(`Match ${match._id}: Innings ${innIdx} bowler ${bw.name} user_id invalid: ${bw.user_id} -> ${validId}`);
                bw.user_id = validId;
                isModified = true;
              }
            });
          }

          // C. ball_history
          if (inn.ball_history && Array.isArray(inn.ball_history)) {
            inn.ball_history.forEach((h, hIdx) => {
              const validBatsmanId = getValidObjectId(h.batsman_id);
              if (String(h.batsman_id) !== String(validBatsmanId)) {
                console.log(`Match ${match._id}: Innings ${innIdx} ball_history[${hIdx}] batsman_id invalid: ${h.batsman_id} -> ${validBatsmanId}`);
                h.batsman_id = validBatsmanId;
                isModified = true;
              }

              const validBowlerId = getValidObjectId(h.bowler_id);
              if (String(h.bowler_id) !== String(validBowlerId)) {
                console.log(`Match ${match._id}: Innings ${innIdx} ball_history[${hIdx}] bowler_id invalid: ${h.bowler_id} -> ${validBowlerId}`);
                h.bowler_id = validBowlerId;
                isModified = true;
              }
            });
          }

          // D. balls
          if (inn.balls && Array.isArray(inn.balls)) {
            inn.balls.forEach((b, bIdx) => {
              const validBatterId = getValidObjectId(b.batter_id);
              if (String(b.batter_id) !== String(validBatterId)) {
                b.batter_id = validBatterId;
                isModified = true;
              }

              const validNonStrikerId = getValidObjectId(b.non_striker_id);
              if (String(b.non_striker_id) !== String(validNonStrikerId)) {
                b.non_striker_id = validNonStrikerId;
                isModified = true;
              }

              const validBowlerId = getValidObjectId(b.bowler_id);
              if (String(b.bowler_id) !== String(validBowlerId)) {
                b.bowler_id = validBowlerId;
                isModified = true;
              }

              if (b.wicket) {
                const validPlayerOutId = getValidObjectId(b.wicket.player_out_id);
                if (String(b.wicket.player_out_id) !== String(validPlayerOutId)) {
                  b.wicket.player_out_id = validPlayerOutId;
                  isModified = true;
                }

                const validFielderId = getValidObjectId(b.wicket.fielder_id);
                if (String(b.wicket.fielder_id) !== String(validFielderId)) {
                  b.wicket.fielder_id = validFielderId;
                  isModified = true;
                }
              }
            });
          }

          // E. fall_of_wickets
          if (inn.fall_of_wickets && Array.isArray(inn.fall_of_wickets)) {
            inn.fall_of_wickets.forEach((f) => {
              const validId = getValidObjectId(f.player_id);
              if (String(f.player_id) !== String(validId)) {
                f.player_id = validId;
                isModified = true;
              }
            });
          }

          // F. partnership_log
          if (inn.partnership_log && Array.isArray(inn.partnership_log)) {
            inn.partnership_log.forEach((p) => {
              const validId1 = getValidObjectId(p.batsman1_id);
              if (String(p.batsman1_id) !== String(validId1)) {
                p.batsman1_id = validId1;
                isModified = true;
              }
              const validId2 = getValidObjectId(p.batsman2_id);
              if (String(p.batsman2_id) !== String(validId2)) {
                p.batsman2_id = validId2;
                isModified = true;
              }
            });
          }
        });
      }

      if (isModified) {
        match.markModified('innings');
        await match.save();
        console.log(`Saved clean match ${match._id}`);
      }
    }

    console.log('🚀 DB Sanitize Complete!');
    process.exit(0);
  } catch (err) {
    console.error('Error during sanitization:', err);
    process.exit(1);
  }
}

sanitizeMatches();

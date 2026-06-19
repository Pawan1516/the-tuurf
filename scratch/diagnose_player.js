const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });
console.log('Env absolute path:', path.join(__dirname, '..', 'backend', '.env'));
console.log('MONGODB_URI from env:', process.env.MONGODB_URI);


const User = require('../backend/models/User');
const Match = require('../backend/models/Match');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB.");

    const phone = '7993962018';
    const user = await User.findOne({ phone: new RegExp(phone) });
    if (!user) {
      console.log("Player not found in database!");
      await mongoose.disconnect();
      return;
    }

    console.log("Player found:");
    console.log("ID:", user._id);
    console.log("Name:", user.name);
    console.log("Username:", user.username);
    console.log("Phone:", user.phone);
    console.log("Stats in User doc:", JSON.stringify(user.stats, null, 2));

    // Search for matches in squad
    const matchesInSquad = await Match.find({
      $or: [
        { 'team_a.squad': user._id },
        { 'team_b.squad': user._id },
        { 'quick_teams.team_a.players.user_id': user._id },
        { 'quick_teams.team_b.players.user_id': user._id },
        { 'innings.batsmen.user_id': user._id },
        { 'innings.bowlers.user_id': user._id }
      ]
    });

    console.log(`\nMatches matching user ID (${user._id}): ${matchesInSquad.length}`);
    for (const m of matchesInSquad) {
      console.log(`Match ID: ${m._id}, Status: ${m.status}, Verified: ${m.verification?.status}, Online/Offline: ${m.is_offline_match ? 'Offline' : 'Online'}`);
    }

    // Search for matches matching name-based
    const matchesByName = await Match.find({
      $or: [
        { 'innings.batsmen.name': { $regex: new RegExp(`^${user.name}$`, 'i') } },
        { 'innings.bowlers.name': { $regex: new RegExp(`^${user.name}$`, 'i') } }
      ]
    });

    console.log(`\nMatches matching user Name (${user.name}): ${matchesByName.length}`);
    for (const m of matchesByName) {
      console.log(`Match ID: ${m._id}, Status: ${m.status}, Verified: ${m.verification?.status}, Online/Offline: ${m.is_offline_match ? 'Offline' : 'Online'}`);
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

run();

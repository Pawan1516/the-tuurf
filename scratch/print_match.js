const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });
const Match = require('../backend/models/Match');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected');
    const match = await Match.findById('6a21736eaa3575e36799c1a2');
    console.log(JSON.stringify(match, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();

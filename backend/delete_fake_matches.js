require('dotenv').config();
const mongoose = require('mongoose');
const Match = require('./models/Match');

async function deleteFake() {
    await mongoose.connect(process.env.MONGODB_URI);
    const result = await Match.deleteMany({ status: { $ne: 'Completed' } });
    console.log(`Deleted ${result.deletedCount} fake/incomplete matches.`);
    process.exit(0);
}
deleteFake();

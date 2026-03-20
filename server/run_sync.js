const mongoose = require('mongoose');
require('dotenv').config();
const { autoGenerateSlots } = require('./utils/slotGenerator');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    console.log('Connected to DB');
    await autoGenerateSlots(30);
    console.log('Done');
    process.exit(0);
}).catch(e => {
    console.error(e);
    process.exit(1);
});

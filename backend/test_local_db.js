const mongoose = require('mongoose');

async function testLocal() {
    console.log('Testing Local connection...');
    try {
        await mongoose.connect('mongodb://localhost:27017/the-turf', {
            serverSelectionTimeoutMS: 2000
        });
        console.log('SUCCESS: Connected to Local MongoDB');
        process.exit(0);
    } catch (err) {
        console.error('FAILURE: Local connection failed');
        process.exit(1);
    }
}

testLocal();

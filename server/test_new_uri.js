const mongoose = require('mongoose');
const uri = "mongodb+srv://pvan_db_user:23951A66c0@cluster0.itzk1ia.mongodb.net/the-turf?retryWrites=true&w=majority";

async function test() {
    console.log('Testing with provided credentials...');
    try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
        console.log('✅ SUCCESS: Connected to MongoDB Atlas!');
        process.exit(0);
    } catch (err) {
        console.error('❌ FAILED:', err.message);
        process.exit(1);
    }
}
test();

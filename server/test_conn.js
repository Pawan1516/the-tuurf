const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const testConnection = async () => {
    try {
        console.log('Testing connection to:', process.env.MONGODB_URI.replace(/\/\/.*@/, '//****:****@'));
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000
        });
        console.log('SUCCESS: Connected to MongoDB');
        process.exit(0);
    } catch (err) {
        console.error('FAILURE:', err.message);
        process.exit(1);
    }
};

testConnection();

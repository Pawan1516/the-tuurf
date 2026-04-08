const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: './backend/.env' });

async function resetAndVerify() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;

        const email = 'ps143143142@gmail.com';
        const newPass = 'turf@admin123';
        
        // Use sync for deterministic reliability in script
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(newPass, salt);

        console.log(`Setting password for ${email} to "${newPass}"`);
        console.log(`Generated Hash: ${hash}`);

        const res = await db.collection('users').updateOne(
            { email },
            { $set: { password: hash, isVerified: true, role: 'PLAYER' } }
        );

        console.log('Update Result:', res);

        // Verify immediately
        const user = await db.collection('users').findOne({ email });
        const isMatch = bcrypt.compareSync(newPass, user.password);
        console.log('Verification Match:', isMatch);

        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}

resetAndVerify();

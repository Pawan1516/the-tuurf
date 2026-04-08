const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: './backend/.env' });

async function checkPass(identifier, plainPass) {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        let query = {};
        if (identifier.includes('@')) {
            query = { email: identifier.toLowerCase() };
        } else {
            const cleanPhone = identifier.replace(/\D/g, '').replace(/^91/, '').slice(-10);
            query = { phone: cleanPhone };
        }

        const db = mongoose.connection.db;
        
        // Try users
        let user = await db.collection('users').findOne(query);
        let collection = 'users';
        
        if (!user) {
            // Try admins
            user = await db.collection('admins').findOne(query);
            collection = 'admins';
        }

        if (user) {
            console.log(`User found in "${collection}":`, user.email || user.phone);
            console.log('Stored Hash:', user.password);
            
            const isMatch = await bcrypt.compare(plainPass, user.password);
            console.log('Password Match:', isMatch);
            
            if (!isMatch) {
                console.log('Recommendation: Check if there are trailing/leading spaces in input or if the password was hashed with a different logic.');
            }
        } else {
            console.log('User not found.');
        }

        await mongoose.connection.close();
    } catch (err) {
        console.error('Error:', err);
    }
}

const id = process.argv[2] || 'ps143143142@gmail.com';
const pass = process.argv[3] || 'password123'; // Default to something common if not provided, but ideally user provides it
checkPass(id, pass);

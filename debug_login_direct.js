const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

async function debugUser(identifier) {
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

        console.log('Searching for:', query);

        // Directly use the underlying driver to avoid model issues if they exist
        const db = mongoose.connection.db;
        
        console.log('Checking "users" collection...');
        const user = await db.collection('users').findOne(query);
        if (user) {
            console.log('User Found in "users" collection:');
            console.log('ID:', user._id);
            console.log('Name:', user.name);
            console.log('Email:', user.email);
            console.log('Phone:', user.phone);
            console.log('Role:', user.role);
            console.log('isVerified:', user.isVerified);
            console.log('---');
        } else {
            console.log('User NOT found in "users" collection.');
        }

        console.log('Checking "admins" collection...');
        const admin = await db.collection('admins').findOne(query);
        if (admin) {
            console.log('User Found in "admins" collection:');
            console.log('ID:', admin._id);
            console.log('Name:', admin.name);
            console.log('Email:', admin.email);
            console.log('Role:', admin.role);
            console.log('---');
        } else {
            console.log('User NOT found in "admins" collection.');
        }

        await mongoose.connection.close();
        console.log('Connection closed.');
    } catch (err) {
        console.error('Error during debugging:', err);
    }
}

const testIdentifier = process.argv[2] || 'ps143143142@gmail.com'; 
debugUser(testIdentifier);

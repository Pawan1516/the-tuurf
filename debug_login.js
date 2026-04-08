const mongoose = require('mongoose');
const User = require('./backend/models/User');
const Admin = require('./backend/models/Admin');
require('dotenv').config({ path: './backend/.env' });

async function debugUser(identifier) {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        let query = {};
        if (identifier.includes('@')) {
            query = { email: identifier.toLowerCase() };
        } else {
            const cleanPhone = identifier.replace(/\D/g, '').replace(/^91/, '').slice(-10);
            query = { phone: cleanPhone };
        }

        console.log('Query:', query);

        const user = await User.findOne(query).select('+password');
        if (user) {
            console.log('User Found in User collection:');
            console.log('ID:', user._id);
            console.log('Name:', user.name);
            console.log('Email:', user.email);
            console.log('Phone:', user.phone);
            console.log('Role:', user.role);
            console.log('isVerified:', user.isVerified);
            console.log('isPremium:', user.isPremium);
            console.log('---');
        } else {
            console.log('User NOT found in User collection.');
        }

        const admin = await Admin.findOne(query).select('+password');
        if (admin) {
            console.log('User Found in Admin collection:');
            console.log('ID:', admin._id);
            console.log('Name:', admin.name);
            console.log('Email:', admin.email);
            console.log('Role:', admin.role);
            console.log('---');
        } else {
            console.log('User NOT found in Admin collection.');
        }

        mongoose.connection.close();
    } catch (err) {
        console.error('Error:', err);
    }
}

// Pass the email or phone you are trying to login with here
const testIdentifier = process.argv[2] || 'ps143143142@gmail.com'; 
debugUser(testIdentifier);

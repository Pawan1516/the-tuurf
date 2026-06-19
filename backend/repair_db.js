const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);

    const users = await User.find({});
    let updatedCount = 0;

    for (const u of users) {
        let changed = false;
        
        // Fix phone
        if (u.phone && u.phone.length < 10) {
            const padding = '91'.repeat(5); // just padding with 919191... to make it 10 digits
            u.phone = (padding + u.phone).slice(-10);
            changed = true;
        } else if (u.phone && u.phone.length > 10) {
            u.phone = u.phone.slice(-10);
            changed = true;
        }

        // Fix mobileNumber
        if (u.mobileNumber && u.mobileNumber.length < 10) {
            const padding = '91'.repeat(5);
            u.mobileNumber = (padding + u.mobileNumber).slice(-10);
            changed = true;
        } else if (u.mobileNumber && u.mobileNumber.length > 10) {
            u.mobileNumber = u.mobileNumber.slice(-10);
            changed = true;
        }

        if (changed) {
            try {
                await User.updateOne({ _id: u._id }, { $set: { phone: u.phone, mobileNumber: u.mobileNumber } });
                updatedCount++;
                console.log(`Updated user ${u.name} (ID: ${u._id}) to Phone: ${u.phone}`);
            } catch (err) {
                console.error(`Failed to update user ${u.name}:`, err.message);
            }
        }
    }

    console.log(`Repaired ${updatedCount} users.`);
    await mongoose.disconnect();
}
run();

const mongoose = require('mongoose');
const User = require('./models/User');
const Team = require('./models/Team');
require('dotenv').config();

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);

    const teamId = '6a2c939bafab3cc0b988d83d';
    const mobile = '00712018'; // or '9123456789' or one of the numbers that failed
    const role = 'All-rounder';
    const jerseyNumber = undefined;

    // Simulate the logic in add-by-mobile
    if (!mobile) return console.log({ success: false, message: 'Mobile number is required' });

    // Clean mobile to 10 digits robustly
    const digits = (mobile || '').replace(/\D/g, '');
    const cleanMobile = (digits.length === 12 && digits.startsWith('91')) 
        ? digits.slice(2) 
        : (digits.length === 11 && digits.startsWith('0')) 
            ? digits.slice(1) 
            : digits.slice(-10);
            
    if (cleanMobile.length !== 10) {
        return console.log({ success: false, message: 'Enter a valid 10-digit mobile number', cleanMobile });
    }

    const team = await Team.findById(teamId);
    if (!team) return console.log({ success: false, message: 'Team not found' });

    if (team.players.length >= 25) {
        return console.log({ success: false, message: 'Team is full (max 25 players)' });
    }

    const user = await User.findOne({ $or: [{ phone: cleanMobile }, { mobileNumber: cleanMobile }] })
        .select('name phone mobileNumber avatar cricket_profile');

    if (!user) {
        return console.log({ 
            success: false, 
            message: 'No player found with this mobile number. Ask them to register on the app first.' 
        });
    }

    const isMember = team.players.some(p => p.user_id?.toString() === user._id.toString());
    if (isMember) return console.log({ success: false, message: 'Player is already in the squad' });

    console.log("Success! Player found and not in squad:", user.name);

    await mongoose.disconnect();
}
run();

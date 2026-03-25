require('dotenv').config({ path: './backend/.env' });
const mongoose = require('mongoose');
const Match = require('./backend/models/Match');
const User = require('./backend/models/User');

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const match = await Match.findOne({ status: 'Completed' }).sort({ updatedAt: -1 });
        if (!match) {
            console.log('No completed matches found.');
        } else {
            console.log('Match ID:', match._id);
            console.log('Innings Count:', match.innings.length);
            const inn1 = match.innings[0];
            if (inn1 && inn1.balls && inn1.balls.length > 0) {
                const b = inn1.balls[0];
                console.log('First Ball Data:', JSON.stringify({
                    runs: b.runs_off_bat,
                    is_four: b.is_four,
                    is_six: b.is_six,
                    is_wicket: b.is_wicket
                }));
                
                const fours = inn1.balls.filter(b => b.is_four).length;
                const sixes = inn1.balls.filter(b => b.is_six).length;
                console.log(`Total 4s: ${fours}, Total 6s: ${sixes}`);
            } else {
                console.log('No balls found in innings 1.');
            }
        }
        
        // Also check the specific user "Pavan"
        const pavan = await User.findOne({ phone: '+91 7993962018' });
        if (pavan) {
            console.log('Pavan Stats:', JSON.stringify(pavan.stats, null, 2));
        }

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();

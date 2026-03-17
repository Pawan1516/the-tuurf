const mongoose = require('mongoose');
const Slot = require('./models/Slot');
require('dotenv').config();

const updatePrices = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const freeSlots = await Slot.find({ status: 'free' });
        console.log(`Found ${freeSlots.length} free slots to check.`);

        let updatedCount = 0;

        for (let slot of freeSlots) {
            const slotDate = new Date(slot.date);
            const isWeekend = slotDate.getDay() === 0 || slotDate.getDay() === 6;

            // Assume the start time is like "18:00"
            if (!slot.startTime) continue;

            const hour = parseInt(slot.startTime.split(':')[0]);
            const transitionHour = parseInt(process.env.PRICE_TRANSITION_HOUR) || 18;
            const isDay = hour < transitionHour;

            const priceDay = parseInt(process.env.PRICE_DAY) || 1000;
            const priceNight = parseInt(process.env.PRICE_NIGHT) || 1200;
            const priceWeekendDay = parseInt(process.env.PRICE_WEEKEND_DAY) || 1000;
            const priceWeekendNight = parseInt(process.env.PRICE_WEEKEND_NIGHT) || 1400;

            let newPrice;
            if (isWeekend) {
                newPrice = isDay ? priceWeekendDay : priceWeekendNight;
            } else {
                newPrice = isDay ? priceDay : priceNight;
            }

            if (slot.price !== newPrice) {
                slot.price = newPrice;
                await slot.save();
                updatedCount++;
            }
        }

        console.log(`Successfully updated ${updatedCount} slots.`);
        process.exit(0);
    } catch (error) {
        console.error('Error updating prices:', error);
        process.exit(1);
    }
};

updatePrices();

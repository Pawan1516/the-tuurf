const mongoose = require('mongoose');
const Slot = require('./models/Slot');
const Setting = require('./models/Setting');
require('dotenv').config();

const getSetting = async (key, fallback) => {
    try {
        const setting = await Setting.findOne({ key });
        return setting ? setting.value : fallback;
    } catch (e) {
        return fallback;
    }
};

const updatePrices = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Fetch prices from settings or env
        const priceDay = await getSetting('PRICE_DAY', parseInt(process.env.PRICE_DAY) || 1000);
        const priceNight = await getSetting('PRICE_NIGHT', parseInt(process.env.PRICE_NIGHT) || 1200);
        const priceWeekendDay = await getSetting('PRICE_WEEKEND_DAY', parseInt(process.env.PRICE_WEEKEND_DAY) || 1000);
        const priceWeekendNight = await getSetting('PRICE_WEEKEND_NIGHT', parseInt(process.env.PRICE_WEEKEND_NIGHT) || 1400);
        const transitionHour = await getSetting('PRICE_TRANSITION_HOUR', parseInt(process.env.PRICE_TRANSITION_HOUR) || 18);

        const freeSlots = await Slot.find({ status: 'free' });
        console.log(`Found ${freeSlots.length} free slots to check.`);

        let updatedCount = 0;

        for (let slot of freeSlots) {
            const slotDate = new Date(slot.date);
            const isWeekend = slotDate.getDay() === 0 || slotDate.getDay() === 6;

            // Assume the start time is like "18:00"
            if (!slot.startTime) continue;

            const hour = parseInt(slot.startTime.split(':')[0]);
            const isDay = hour < transitionHour;

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

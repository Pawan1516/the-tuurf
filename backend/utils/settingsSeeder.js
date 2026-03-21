const Setting = require('../models/Setting');

const seedSettings = async () => {
    const defaultSettings = [
        { key: 'PRICE_DAY', value: parseInt(process.env.PRICE_DAY) || 1000, description: 'Weekday hourly rate during day' },
        { key: 'PRICE_NIGHT', value: parseInt(process.env.PRICE_NIGHT) || 1200, description: 'Weekday hourly rate during night' },
        { key: 'PRICE_WEEKEND_DAY', value: parseInt(process.env.PRICE_WEEKEND_DAY) || 1000, description: 'Weekend hourly rate during day' },
        { key: 'PRICE_WEEKEND_NIGHT', value: parseInt(process.env.PRICE_WEEKEND_NIGHT) || 1400, description: 'Weekend hourly rate during night' },
        { key: 'PRICE_TRANSITION_HOUR', value: parseInt(process.env.PRICE_TRANSITION_HOUR) || 18, description: 'Hour at which night pricing starts (0-23)' },
        { key: 'TURF_OPEN_HOUR', value: parseInt(process.env.TURF_OPEN_HOUR) || 7, description: 'Turf opening hour (0-23)' },
        { key: 'TURF_CLOSE_HOUR', value: parseInt(process.env.TURF_CLOSE_HOUR) || 23, description: 'Turf closing hour (0-23)' },
        { key: 'HOLD_DURATION_MINUTES', value: parseInt(process.env.HOLD_DURATION_MINUTES) || 5, description: 'Time in minutes before a held slot is released' },
        { key: 'TURF_NAME', value: process.env.TURF_NAME || 'The Turf', description: 'Display name of the arena' },
        { key: 'TURF_LOCATION', value: process.env.TURF_LOCATION || 'Plot no 491, Madhavapuri Hills, PJR Enclave, PJR Layout, Miyapur, Hyderabad', description: 'Address of the venue' },
        { key: 'UPI_ID', value: process.env.UPI_ID || 'theturf@upi', description: 'UPI ID for payments' },
    ];

    try {
        for (const setting of defaultSettings) {
            const exists = await Setting.findOne({ key: setting.key });
            if (!exists) {
                await Setting.create(setting);
                console.log(`📡 Infrastructure Seeder: Initialized ${setting.key}`);
            }
        }
    } catch (error) {
        console.error('❌ Seeder Error:', error);
    }
};

module.exports = seedSettings;

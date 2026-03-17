/**
 * remove_duplicate_slots.js
 * -----------------------------------------------------------
 * Finds all slots that share the same (date + startTime) and
 * keeps only ONE of them (preferring booked > hold > free).
 * Deletes every other duplicate.
 * -----------------------------------------------------------
 * Usage: node remove_duplicate_slots.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Slot = require('./models/Slot');

const PRIORITY = { booked: 0, hold: 1, free: 2, expired: 3 };

async function removeDuplicates() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Aggregate to find groups with more than 1 slot for same date+startTime
    const duplicateGroups = await Slot.aggregate([
        {
            $group: {
                _id: { date: '$date', startTime: '$startTime' },
                ids: { $push: '$_id' },
                statuses: { $push: '$status' },
                count: { $sum: 1 }
            }
        },
        { $match: { count: { $gt: 1 } } }
    ]);

    if (duplicateGroups.length === 0) {
        console.log('🎉 No duplicate slots found! Database is clean.');
        await mongoose.disconnect();
        return;
    }

    console.log(`🔍 Found ${duplicateGroups.length} duplicate group(s). Cleaning up...\n`);

    let totalDeleted = 0;

    for (const group of duplicateGroups) {
        const { date, startTime } = group._id;

        // Fetch full docs for this group so we can pick the best one
        const slots = await Slot.find({
            date: date,
            startTime: startTime
        }).sort({ createdAt: 1 }); // oldest first as tiebreaker

        // Sort: prefer booked > hold > free > expired, then oldest
        slots.sort((a, b) => {
            const pa = PRIORITY[a.status] ?? 99;
            const pb = PRIORITY[b.status] ?? 99;
            return pa - pb;
        });

        const [keep, ...remove] = slots;
        const removeIds = remove.map(s => s._id);

        console.log(
            `📅 ${date.toISOString().split('T')[0]} ${startTime} — ` +
            `keeping [${keep.status}] id=${keep._id}, ` +
            `deleting ${removeIds.length} duplicate(s)`
        );

        await Slot.deleteMany({ _id: { $in: removeIds } });
        totalDeleted += removeIds.length;
    }

    console.log(`\n✅ Done! Deleted ${totalDeleted} duplicate slot(s) total.`);

    // ── Prevent future duplicates: add a unique index ──────────────────────
    try {
        await Slot.collection.createIndex(
            { date: 1, startTime: 1 },
            { unique: true, name: 'unique_date_startTime' }
        );
        console.log('🔒 Unique index on (date, startTime) ensured.');
    } catch (err) {
        if (err.code === 85 || err.code === 86) {
            console.log('ℹ️  Unique index already exists.');
        } else {
            console.warn('⚠️  Could not create unique index:', err.message);
        }
    }

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB.');
}

removeDuplicates().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});

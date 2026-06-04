const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Slot = require('../models/Slot');
const verifyToken = require('../middleware/verifyToken');
const roleGuard = require('../middleware/roleGuard');

// @route   GET /api/admin-booking/stats
// @desc    Get top summary cards (Today, Week, Month, Total)
router.get('/stats', verifyToken, roleGuard(['admin']), async (req, res) => {
    try {
        const now = new Date();
        const startOfDay = new Date(now.setHours(0, 0, 0, 0));
        
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [total, today, week, month] = await Promise.all([
            Booking.countDocuments({}),
            Booking.countDocuments({ createdAt: { $gte: startOfDay } }),
            Booking.countDocuments({ createdAt: { $gte: startOfWeek } }),
            Booking.countDocuments({ createdAt: { $gte: startOfMonth } })
        ]);

        res.json({
            success: true,
            stats: { total, today, week, month }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   GET /api/admin-booking/list
// @desc    Get filtered/searchable list of bookings
router.get('/list', verifyToken, roleGuard(['admin']), async (req, res) => {
    try {
        const { search, status, date, sort = 'desc' } = req.query;
        let query = {};

        if (search) {
            query.$or = [
                { userName: { $regex: search, $options: 'i' } },
                { bookingId: { $regex: search, $options: 'i' } }
            ];
        }

        if (status && status !== 'all') {
            query.bookingStatus = status;
        }

        if (date) {
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);
            // Since date is stored in slots, we might need to populate or check slot date
            // But if we search by booking creation date:
            query.createdAt = { $gte: start, $lte: end };
        }

        const bookings = await Booking.find(query)
            .sort({ createdAt: sort === 'desc' ? -1 : 1 })
            .populate('slot')
            .limit(100);

        res.json({ success: true, bookings });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   GET /api/admin-booking/analysis
// @desc    Perform booking analysis (Peak time, popular turf, trend, cancellation)
router.get('/analysis', verifyToken, roleGuard(['admin']), async (req, res) => {
    try {
        const bookings = await Booking.find().populate('slot');
        
        // 1. Peak Booking Time
        const timeUsage = {};
        bookings.forEach(b => {
            if (b.slot && b.slot.startTime) {
                const hour = b.slot.startTime.split(':')[0];
                timeUsage[hour] = (timeUsage[hour] || 0) + 1;
            }
        });
        
        let peakHour = 'N/A';
        let maxUsage = 0;
        Object.entries(timeUsage).forEach(([h, count]) => {
            if (count > maxUsage) {
                maxUsage = count;
                peakHour = h;
            }
        });
        const peakTimeString = peakHour !== 'N/A' ? `${peakHour}:00 - ${(parseInt(peakHour)+1)}:00` : 'N/A';

        // 2. Most Booked Turf
        const turfUsage = {};
        bookings.forEach(b => {
            const turf = b.turfName || b.turfLocation || 'Main Ground';
            turfUsage[turf] = (turfUsage[turf] || 0) + 1;
        });
        
        let popularTurf = 'N/A';
        let maxTurf = 0;
        Object.entries(turfUsage).forEach(([t, count]) => {
            if (count > maxTurf) {
                maxTurf = count;
                popularTurf = t;
            }
        });

        // 3. Daily Booking Trend (last 7 days)
        const dailyTrend = {};
        const now = new Date();
        for(let i=6; i>=0; i--) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            dailyTrend[d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })] = 0;
        }

        bookings.forEach(b => {
            const date = new Date(b.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
            if (dailyTrend.hasOwnProperty(date)) {
                dailyTrend[date]++;
            }
        });

        const trendData = Object.entries(dailyTrend).map(([name, count]) => ({ name, count }));

        // 4. Cancellation Rate
        const total = bookings.length;
        const cancelled = bookings.filter(b => b.bookingStatus === 'cancelled' || b.bookingStatus === 'rejected').length;
        const cancellationRate = total > 0 ? (cancelled / total * 100).toFixed(1) : 0;

        // 5. Weekly Trend (Weekend vs Weekday)
        let weekendCount = 0;
        let weekdayCount = 0;
        bookings.forEach(b => {
            const day = new Date(b.createdAt).getDay();
            if (day === 0 || day === 6) weekendCount++;
            else weekdayCount++;
        });

        res.json({
            success: true,
            analysis: {
                peakTime: peakTimeString,
                popularTurf,
                cancellationRate,
                trendData,
                timeSlotData: Object.entries(timeUsage).map(([hour, count]) => ({ hour: `${hour}:00`, count })),
                turfPopularity: Object.entries(turfUsage).map(([name, count]) => ({ name, count })),
                weekendVsWeekday: { weekend: weekendCount, weekday: weekdayCount }
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   GET /api/admin-booking/prediction
// @desc    Logic-based booking prediction
router.get('/prediction', verifyToken, roleGuard(['admin']), async (req, res) => {
    try {
        const bookings = await Booking.find().populate('slot');
        
        let eveningBookings = 0;
        let morningBookings = 0;
        let weekendBookings = 0;
        let weekdayBookings = 0;

        bookings.forEach(b => {
            // Time logic
            if (b.slot && b.slot.startTime) {
                const hour = parseInt(b.slot.startTime.split(':')[0]);
                if (hour >= 16) eveningBookings++;
                else morningBookings++;
            }

            // Day logic
            const day = new Date(b.createdAt).getDay();
            if (day === 0 || day === 6) weekendBookings++;
            else weekdayBookings++;
        });

        let predictions = [];

        if (eveningBookings > morningBookings) {
            predictions.push("Evening slots will be highly booked today based on current preference patterns.");
        } else if (morningBookings > eveningBookings) {
            predictions.push("Morning training sessions are seeing increased traction today.");
        }

        if (weekendBookings > weekdayBookings) {
            predictions.push("High traffic surge expected this weekend. Ensure staff readiness.");
        } else {
            predictions.push("Weekday bookings are steady, ideal for maintenance protocols.");
        }

        // Trend logic (last 2 days)
        const todayCount = bookings.filter(b => {
            const today = new Date();
            today.setHours(0,0,0,0);
            return new Date(b.createdAt) >= today;
        }).length;

        const yesterdayCount = bookings.filter(b => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0,0,0,0);
            const today = new Date();
            today.setHours(0,0,0,0);
            return new Date(b.createdAt) >= yesterday && new Date(b.createdAt) < today;
        }).length;

        if (todayCount > yesterdayCount) {
            predictions.push("Inbound booking velocity is increasing. Demand peak likely tomorrow.");
        }

        res.json({
            success: true,
            predictions
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;

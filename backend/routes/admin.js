const express = require('express');
const router = express.Router();
const Worker = require('../models/Worker');
const Admin = require('../models/Admin');
const Booking = require('../models/Booking');
const Slot = require('../models/Slot');
const verifyToken = require('../middleware/verifyToken');
const roleGuard = require('../middleware/roleGuard');
const { generateBookingReport, createPDF } = require('../services/pdfReport');
const { createBookingEntry } = require('../services/bookingService');
const Setting = require('../models/Setting');
const User = require('../models/User');
const Match = require('../models/Match');
const QRScanLog = require('../models/QRScanLog');
const QRService = require('../services/qrService');

// @route   GET /api/admin/scan-dashboard
// @desc    Today's verification status
// @access  Private (ADMIN)
router.get('/scan-dashboard', verifyToken, roleGuard(['ADMIN', 'admin']), async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0,0,0,0);
        
        const [totalMatches, verifiedMatches, totalScans, successScans] = await Promise.all([
            Match.countDocuments({ start_time: { $gte: today } }),
            Match.countDocuments({ start_time: { $gte: today }, 'verification.status': 'VERIFIED' }),
            QRScanLog.countDocuments({ scan_time: { $gte: today } }),
            QRScanLog.countDocuments({ scan_time: { $gte: today }, scan_result: 'SUCCESS' })
        ]);

        res.json({
            success: true,
            dashboard: {
                matches: {
                    total: totalMatches,
                    verified: verifiedMatches,
                    pending: totalMatches - verifiedMatches
                },
                scans: {
                    total: totalScans,
                    success: successScans,
                    successRate: totalScans > 0 ? (successScans / totalScans * 100).toFixed(1) : 0
                }
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   POST /api/admin/scan-match
// @desc    Admin scans QR to verify match
// @access  Private (ADMIN)
router.post('/scan-match', verifyToken, roleGuard(['ADMIN', 'admin']), async (req, res) => {
    try {
        const { qr_payload, ip_address, device_info } = req.body;
        if (!qr_payload) return res.status(400).json({ success: false, message: 'Registry failure: Missing payload.' });

        const result = await QRService.verifyQR(qr_payload, req.user.id, ip_address, device_info);
        
        if (result.success) {
            const io = req.app.get('socketio');
            if (io) {
                io.to(`match_${result.match._id}`).emit('match:verified', {
                    match_id: result.match._id,
                    status: 'VERIFIED'
                });
            }
            res.json({ success: true, match: result.match });
        } else {
            res.status(400).json({ success: false, reason: result.reason });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   POST /api/admin/override-match
// @desc    Manual verification override
// @access  Private (ADMIN)
router.post('/override-match', verifyToken, roleGuard(['ADMIN', 'admin']), async (req, res) => {
    try {
        const { match_id, reason } = req.body;
        const match = await Match.findById(match_id);
        
        if (!match) return res.status(404).json({ success: false, message: 'Match Node Not Found.' });
        
        match.verification.status = 'VERIFIED';
        match.start_control.can_start = true;
        match.start_control.start_method = 'ADMIN_OVERRIDE';
        
        await match.save();

        // Log the override
        const log = new QRScanLog({
            match_id: match._id,
            scanned_by: req.user.id,
            scan_result: 'SUCCESS',
            error_reason: `MANUAL_OVERRIDE: ${reason}`
        });
        await log.save();

        const io = req.app.get('socketio');
        if (io) {
            io.to(`match_${match._id}`).emit('match:verified', {
                match_id: match._id,
                status: 'VERIFIED'
            });
        }

        res.json({ success: true, message: 'Match Protocol Overridden.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Create Worker (ADMIN ONLY)
router.post('/workers', verifyToken, roleGuard(['admin']), async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ success: false, message: 'Protocol violation during registration: Missing mandatory credentials.' });
    }

    // Check if worker already exists
    const existingWorker = await Worker.findOne({ email });
    if (existingWorker) {
      return res.status(400).json({ success: false, message: 'Worker already exists' });
    }

    const worker = new Worker({
      name,
      email,
      phone,
      password,
      role: 'worker'
    });

    await worker.save();

    res.status(201).json({
      success: true,
      message: 'Worker created successfully',
      worker: {
        id: worker._id,
        name: worker.name,
        email: worker.email,
        phone: worker.phone
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all workers (ADMIN ONLY)
router.get('/workers', verifyToken, roleGuard(['admin']), async (req, res) => {
  try {
    const workers = await Worker.find().select('-password').populate('assignedSlots');
    res.json({ success: true, workers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update worker
router.put('/workers/:id', verifyToken, roleGuard(['admin']), async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;

    const worker = await Worker.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).select('-password');

    res.json({ success: true, worker });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete worker (ADMIN ONLY)
router.delete('/workers/:id', verifyToken, roleGuard(['admin']), async (req, res) => {
  try {
    const worker = await Worker.findByIdAndDelete(req.params.id);

    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    // Remove worker from assigned slots
    await Slot.updateMany({ assignedWorker: req.params.id }, { assignedWorker: null });

    res.json({ success: true, message: 'Worker deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get revenue stats (ADMIN ONLY)
router.get('/revenue', verifyToken, roleGuard(['admin']), async (req, res) => {
  try {
    const { period = 'all' } = req.query;
    let startDate;

    const now = new Date();

    if (period === 'daily') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'weekly') {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      startDate = weekAgo;
    } else if (period === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const query = {
      bookingStatus: 'confirmed'
    };

    if (startDate) {
      query.confirmedAt = { $gte: startDate };
    }

    let bookings = [];
    if (require('mongoose').connection.readyState === 1) {
      bookings = await Booking.find(query).maxTimeMS(2000);
    }

    const totalRevenue = bookings.reduce((sum, booking) => sum + (booking.amount || 0), 0);

    // Group by date for daily breakdown
    const dailyRevenue = {};
    bookings.forEach(booking => {
      const date = new Date(booking.confirmedAt || booking.createdAt).toLocaleDateString();
      dailyRevenue[date] = (dailyRevenue[date] || 0) + (booking.amount || 0);
    });

    // Booking status breakdown
    let allBookings = [];
    if (require('mongoose').connection.readyState === 1) {
      allBookings = await Booking.find().maxTimeMS(2000);
    }

    const statusBreakdown = {
      confirmed: allBookings.filter(b => b.bookingStatus === 'confirmed').length,
      rejected: allBookings.filter(b => b.bookingStatus === 'rejected').length,
      pending: allBookings.filter(b => b.bookingStatus === 'pending').length,
      hold: allBookings.filter(b => b.bookingStatus === 'hold').length,
      noShow: allBookings.filter(b => b.bookingStatus === 'no-show').length,
      cancelled: allBookings.filter(b => b.bookingStatus === 'cancelled').length
    };

    res.json({
      success: true,
      totalRevenue,
      dailyRevenue,
      statusBreakdown,
      totalBookings: allBookings.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Download CSV report (ADMIN ONLY)
router.get('/report/csv', verifyToken, roleGuard(['admin']), async (req, res) => {
  try {
    const { period } = req.query;
    const filter = {};

    if (period && period !== 'all') {
      const now = new Date();
      if (period === 'daily') {
        filter.confirmedAt = { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) };
      } else if (period === 'weekly') {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        filter.confirmedAt = { $gte: weekAgo };
      } else if (period === 'monthly') {
        filter.confirmedAt = { $gte: new Date(now.getFullYear(), now.getMonth(), 1) };
      }
    }

    const bookings = await Booking.find(filter).populate('slot').lean();

    const csv = [
      ['Sl.No', 'Name', 'Mobile Number', 'Slot Timings', 'Status', 'Payment Advance', 'Full Payment']
    ];

    bookings.forEach((booking, index) => {
      const slotDate = booking.slot ? new Date(booking.slot.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }) : '';
      const slotStartTime = booking.slot ? booking.slot.startTime : '';
      const slotEndTime = booking.slot ? booking.slot.endTime : '';
      const slotInfo = slotDate ? `${slotDate} | ${slotStartTime} - ${slotEndTime}` : 'N/A';

      const advPayment = booking.paymentType === 'advance' ? booking.amount : 0;
      const fullPayment = booking.paymentType === 'full' ? booking.amount : (booking.totalAmount || 0);

      csv.push([
        index + 1,
        booking.userName,
        booking.userPhone,
        slotInfo,
        booking.bookingStatus,
        advPayment,
        fullPayment
      ]);
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="admin-report-${period || 'all'}.csv"`);
    res.send(csv.map(row => row.join(',')).join('\n'));
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Download PDF report (ADMIN ONLY)
router.get('/report/pdf', verifyToken, roleGuard(['admin']), async (req, res) => {
  try {
    const { status, startDate, endDate, worker, period } = req.query;

    const filters = {};
    if (status) filters.status = status;

    if (period && period !== 'all') {
      const now = new Date();
      if (period === 'daily') {
        filters.startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (period === 'weekly') {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        filters.startDate = weekAgo;
      } else if (period === 'monthly') {
        filters.startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }
    } else {
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
    }

    if (worker) filters.worker = worker;

    const result = await generateBookingReport(filters);

    if (!result.success) {
      return res.status(500).json({ success: false, message: result.error });
    }

    const doc = createPDF(result.bookings, result.stats);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="booking-report.pdf"');

    doc.pipe(res);
    doc.end();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});



// Manual Booking (ADMIN ONLY)
router.post('/bookings/manual', verifyToken, roleGuard(['admin']), async (req, res) => {
  try {
    const booking = await createBookingEntry({ ...req.body, platform: 'admin' });
    res.status(201).json({ success: true, message: 'Manual booking created successfully', booking });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Send custom WhatsApp message (ADMIN ONLY)
router.post('/message', verifyToken, roleGuard(['admin']), async (req, res) => {
  try {
    const { phone, message, bookingId } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ success: false, message: 'Phone and message are required' });
    }

    const { sendWhatsAppNotification } = require('../services/whatsapp');
    const result = await sendWhatsAppNotification(phone, message, bookingId, 'custom');

    if (result.success) {
      res.json({ success: true, message: 'Message sent successfully' });
    } else {
      res.status(500).json({ success: false, message: result.error || 'Failed to send message' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Sync slots manually (ADMIN ONLY)
router.post('/system/sync-slots', verifyToken, roleGuard(['admin']), async (req, res) => {
  try {
    const { autoGenerateSlots } = require('../utils/slotGenerator');
    await autoGenerateSlots(30); // Sync for 30 days
    res.json({ success: true, message: 'Infrastructure synchronization protocol completed.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Check system health (ADMIN ONLY)
router.get('/system/status', verifyToken, roleGuard(['admin']), async (req, res) => {
  try {
    const hasAI = !!process.env.OPENAI_API_KEY;
    const hasWA = !!process.env.TWILIO_ACCOUNT_SID;
    const dbStatus = require('mongoose').connection.readyState === 1 ? 'Operational' : 'Disconnected';

    res.json({
      success: true,
      status: {
        ai_agent: hasAI ? 'Active' : 'Missing API Key',
        whatsapp_node: hasWA ? 'Online' : 'Offline',
        database: dbStatus,
        uptime: process.uptime()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// AI Command Center (ADMIN ONLY)
router.post('/ai-command', verifyToken, roleGuard(['admin']), async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Command message required' });

    const { processCricBotCommand } = require('../services/aiAgent');

    // Fetch some basic context (optional but helpful)
    const freeSlots = await Slot.find({
      date: { $gte: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()) },
      status: 'free'
    }).limit(10).lean();

    const aiResponse = await processCricBotCommand(message, { availableSlots: freeSlots });

    if (!aiResponse) {
      return res.status(500).json({ success: false, message: 'AI Agent failed to process command' });
    }

    // If it's a manual booking request, trigger the manual booking logic
    if (aiResponse.type === 'MANUAL_BOOKING') {
      const { name, phone, date, startTime, duration } = aiResponse.data;

      const hoursToAdd = duration.includes('2') ? 2 : 1;
      const [h, m] = startTime.split(':').map(Number);
      const endH = h + hoursToAdd;
      const endTime = `${endH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

      // Calculate amount based on system settings
      const settings = await Setting.find();
      const config = settings.reduce((acc, s) => { acc[s.key] = s.value; return acc; }, {});
      
      const priceDay = config.PRICE_DAY || 1000;
      const priceNight = config.PRICE_NIGHT || 1200;
      const priceWeekendDay = config.PRICE_WEEKEND_DAY || 1000;
      const priceWeekendNight = config.PRICE_WEEKEND_NIGHT || 1400;
      const transHour = config.PRICE_TRANSITION_HOUR || 18;

      const bookingDate = new Date(date);
      const isWeekend = bookingDate.getDay() === 0 || bookingDate.getDay() === 6;
      
      let amount = 0;
      for (let i = 0; i < hoursToAdd; i++) {
        const currentHour = h + i;
        const isDay = currentHour < transHour;
        if (isWeekend) {
          amount += isDay ? priceWeekendDay : priceWeekendNight;
        } else {
          amount += isDay ? priceDay : priceNight;
        }
      }

      try {
        const booking = await createBookingEntry({
          userName: name,
          userPhone: phone,
          amount,
          date,
          startTime,
          endTime,
          platform: 'admin'
        });

        return res.json({
          success: true,
          type: 'MANUAL_BOOKING',
          ai_reply: aiResponse.reply,
          booking,
          parsed_data: aiResponse.data
        });
      } catch (err) {
        return res.status(400).json({
          success: false,
          type: 'MANUAL_BOOKING',
          message: err.message,
          ai_reply: `System error: ${err.message}`
        });
      }
    }

    // Default chat response
    res.json({
      success: true,
      type: 'CHAT_RESPONSE',
      reply: aiResponse.reply
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET Settings (ADMIN ONLY)
router.get('/settings', verifyToken, roleGuard(['admin']), async (req, res) => {
  try {
    const settings = await Setting.find();
    // Transform to an object for easier frontend use
    const config = settings.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {});
    res.json({ success: true, settings: config });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update Settings (Bulk) (ADMIN ONLY)
router.post('/settings/bulk', verifyToken, roleGuard(['admin']), async (req, res) => {
  try {
    const { settings } = req.body; // Expecting { key: value, ... }

    const operations = Object.entries(settings).map(([key, value]) => ({
      updateOne: {
        filter: { key },
        update: { value },
        upsert: true
      }
    }));

    await Setting.bulkWrite(operations);
    res.json({ success: true, message: 'Settings synchronization complete.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET Activity Log — recent bookings with slot info (ADMIN ONLY)
router.get('/activity-log', verifyToken, roleGuard(['admin']), async (req, res) => {
  try {
    const recentBookings = await Booking.find()
      .populate('slot', 'startTime endTime date')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const formatTime12h = (t) => {
      if (!t) return 'N/A';
      const [h, m] = t.split(':').map(Number);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
    };

    const logs = recentBookings.map(b => ({
      id: b._id,
      userName: b.userName,
      userPhone: b.userPhone,
      status: b.bookingStatus,
      amount: b.amount,
      slotDate: b.slot?.date ? new Date(b.slot.date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short' }) : 'N/A',
      slotTime: b.slot
        ? `${formatTime12h(b.slot.startTime)} – ${formatTime12h(b.slot.endTime)}`
        : 'N/A',
      createdAt: b.createdAt,
      platform: b.platform || 'web',
    }));

    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all users (ADMIN ONLY)
router.get('/users', verifyToken, roleGuard(['admin']), async (req, res) => {
  try {
    const users = await User.find().select('name email password realPassword');
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin QR Routes

// POST /api/admin/scan-match - Admin scans QR data
router.post('/scan-match', verifyToken, roleGuard(['admin']), async (req, res) => {
    try {
        const { qr_payload, ip_address, device_info } = req.body;
        const adminId = req.user._id; // from Auth middlewae

        if (!qr_payload) return res.status(400).json({ success: false, message: 'QR payload required' });

        const result = await QRService.verifyQR(qr_payload, adminId, ip_address, device_info);

        if (result.success) {
            res.json({ success: true, message: 'Match successfully verified', match: result.match });
        } else {
            res.status(400).json({ success: false, message: 'QR scan failed', reason: result.reason });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/admin/scan-dashboard - Today's scan status
router.get('/scan-dashboard', verifyToken, roleGuard(['admin']), async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0,0,0,0);

        const [totalMatches, verifiedMatches, pendingMatches, offlineMatches] = await Promise.all([
            Match.countDocuments({ start_time: { $gte: today } }),
            Match.countDocuments({ start_time: { $gte: today }, 'verification.status': 'VERIFIED' }),
            Match.countDocuments({ start_time: { $gte: today }, 'verification.status': 'PENDING' }),
            Match.countDocuments({ start_time: { $gte: today }, 'verification.status': 'OFFLINE' })
        ]);

        const [totalScans, successfulScans, failedScans] = await Promise.all([
            QRScanLog.countDocuments({ scan_time: { $gte: today } }),
            QRScanLog.countDocuments({ scan_time: { $gte: today }, scan_result: 'SUCCESS' }),
            QRScanLog.countDocuments({ scan_time: { $gte: today }, scan_result: { $ne: 'SUCCESS' } })
        ]);

        res.json({
            success: true,
            dashboard: {
                matches: {
                    total: totalMatches,
                    verified: verifiedMatches,
                    pending: pendingMatches,
                    offline: offlineMatches,
                    verificationRate: totalMatches > 0 ? (verifiedMatches / totalMatches * 100).toFixed(2) : 0
                },
                scans: {
                    total: totalScans,
                    successful: successfulScans,
                    failed: failedScans,
                    successRate: totalScans > 0 ? (successfulScans / totalScans * 100).toFixed(2) : 0
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/admin/scan-reports - Scan reports for date range
router.get('/scan-reports', verifyToken, roleGuard(['admin']), async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        let query = {};
        if (start_date && end_date) {
            query.scan_time = { $gte: new Date(start_date), $lte: new Date(end_date) };
        }
        
        const logs = await QRScanLog.find(query).populate('scanned_by match_id').sort({ scan_time: -1 }).limit(100);
        res.json({ success: true, logs });
    } catch (error) {
         res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/admin/override-match - Manual override
router.post('/override-match', verifyToken, roleGuard(['admin']), async (req, res) => {
    try {
        const { match_id, reason } = req.body;
        const adminId = req.user._id;

        const match = await Match.findById(match_id);
        if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

        match.verification.status = 'VERIFIED';
        match.start_control.can_start = true;
        match.start_control.start_method = 'ADMIN_OVERRIDE';
        await match.save();

        await QRService.logScan({
            match_id,
            scanned_by: adminId,
            scan_result: 'MANUAL_OVERRIDE',
            error_reason: reason || 'Manual Admin Override'
        });

        res.json({ success: true, message: 'Match overridden successfully', match });
    } catch (error) {
         res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;

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
      ['sl no', 'name', 'mobile number', 'slot', 'status', 'money']
    ];

    bookings.forEach((booking, index) => {
      const slotDate = booking.slot ? new Date(booking.slot.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }) : '';
      const slotTime = booking.slot ? booking.slot.startTime : '';
      const slotInfo = slotDate ? `${slotDate} ${slotTime}` : 'N/A';

      csv.push([
        index + 1,
        booking.userName,
        booking.userPhone,
        slotInfo,
        booking.bookingStatus,
        booking.amount
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
    const hasWA = !!process.env.WA_ACCESS_TOKEN;
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
      date: { $gte: new Date().toISOString().split('T')[0] },
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

      // Calculate amount based on prompt rules
      let amount = 0;
      if (hoursToAdd === 1) {
        amount = h < 18 ? 800 : 1200;
      } else {
        if (h < 18 && endH <= 18) amount = 1600;
        else if (h >= 18) amount = 2400;
        else amount = 2000;
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

module.exports = router;

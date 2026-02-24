const PDFDocument = require('pdfkit');
const Booking = require('../models/Booking');
const Slot = require('../models/Slot');

const generateBookingReport = async (filters = {}) => {
  try {
    // Build query based on filters
    const query = {};

    if (filters.status) {
      query.bookingStatus = filters.status;
    }
    if (filters.worker) {
      const slots = await Slot.find({ assignedWorker: filters.worker });
      query.slot = { $in: slots.map(s => s._id) };
    }
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.createdAt.$lte = new Date(filters.endDate);
      }
    }

    // Fetch bookings with slot details
    const bookings = await Booking.find(query)
      .populate('slot')
      .lean();

    // Calculate statistics
    const stats = {
      totalBookings: bookings.length,
      confirmed: bookings.filter(b => b.bookingStatus === 'confirmed').length,
      rejected: bookings.filter(b => b.bookingStatus === 'rejected').length,
      pending: bookings.filter(b => b.bookingStatus === 'pending').length,
      totalRevenue: bookings
        .filter(b => b.bookingStatus === 'confirmed')
        .reduce((sum, b) => sum + (b.amount || 0), 0)
    };

    return {
      success: true,
      bookings,
      stats
    };
  } catch (error) {
    console.error('Report generation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

const createPDF = (bookings, stats) => {
  const doc = new PDFDocument();

  // Header
  doc.fontSize(24).font('Helvetica-Bold').text('The Turf - Booking Report', { align: 'center' });
  doc.fontSize(10).font('Helvetica').text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
  doc.moveDown();

  // Summary Section
  doc.fontSize(14).font('Helvetica-Bold').text('Summary');
  doc.fontSize(10).font('Helvetica');
  doc.text(`Total Bookings: ${stats.totalBookings}`);
  doc.text(`Confirmed: ${stats.confirmed}`);
  doc.text(`Rejected: ${stats.rejected}`);
  doc.text(`Pending: ${stats.pending}`);
  doc.text(`Total Revenue: ₹${stats.totalRevenue}`);
  doc.moveDown();

  // Table Header
  const headerY = doc.y;
  doc.fontSize(10).font('Helvetica-Bold');
  doc.text('Sl No', 40, headerY, { width: 30 });
  doc.text('Name', 75, headerY, { width: 110 });
  doc.text('Mobile Number', 190, headerY, { width: 90 });
  doc.text('Slot', 285, headerY, { width: 100 });
  doc.text('Status', 390, headerY, { width: 80 });
  doc.text('Money', 475, headerY, { width: 60 });
  doc.moveDown(1.5);

  // Table Rows
  doc.fontSize(9).font('Helvetica');
  bookings.forEach((booking, index) => {
    const slotDate = booking.slot?.date ? new Date(booking.slot.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }) : 'N/A';
    const slotTime = booking.slot?.startTime || 'N/A';
    const slotInfo = `${slotDate} ${slotTime}`;

    const currentY = doc.y;
    doc.text(index + 1, 40, currentY, { width: 30 });
    doc.text(booking.userName, 75, currentY, { width: 110 });
    doc.text(booking.userPhone, 190, currentY, { width: 90 });
    doc.text(slotInfo, 285, currentY, { width: 100 });
    doc.text(booking.bookingStatus || 'pending', 390, currentY, { width: 80 });
    doc.text(`Rs. ${booking.amount || 0}`, 475, currentY, { width: 60 });
    doc.moveDown(1.5);

    // Add new page if needed
    if (doc.y > 700) {
      doc.addPage();
    }
  });

  return doc;
};

module.exports = {
  generateBookingReport,
  createPDF
};

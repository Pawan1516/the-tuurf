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

const path = require('path');
const fs = require('fs');

const createPDF = (bookings, stats) => {
  const doc = new PDFDocument();

  // Logo
  const logoPath = path.join(__dirname, '../../client/public/logo.png');
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, (doc.page.width - 60) / 2, 30, { width: 60 });
    doc.moveDown(4);
  } else {
    // Fallback or just space
    doc.moveDown(2);
  }

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
  doc.fontSize(9).font('Helvetica-Bold');
  doc.text('Sl.No', 40, headerY, { width: 25 });
  doc.text('Name', 70, headerY, { width: 90 });
  doc.text('Mobile Number', 165, headerY, { width: 80 });
  doc.text('Slot Timings', 250, headerY, { width: 105 });
  doc.text('Status', 360, headerY, { width: 60 });
  doc.text('Advance', 425, headerY, { width: 55 });
  doc.text('Full Payment', 485, headerY, { width: 65 });
  doc.moveDown(1.5);

  // Table Rows
  doc.fontSize(8).font('Helvetica');
  bookings.forEach((booking, index) => {
    const slotDate = booking.slot?.date ? new Date(booking.slot.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }) : 'N/A';
    const slotStartTime = booking.slot?.startTime || '??:??';
    const slotEndTime = booking.slot?.endTime || '??:??';
    const slotInfo = booking.slot?.date ? `${slotDate} | ${slotStartTime}-${slotEndTime}` : 'N/A';

    const advPayment = booking.paymentType === 'advance' ? booking.amount : 0;
    const fullPayment = booking.paymentType === 'full' ? booking.amount : (booking.totalAmount || 0);

    const currentY = doc.y;
    doc.text(index + 1, 40, currentY, { width: 25 });
    doc.text(booking.userName, 70, currentY, { width: 90 });
    doc.text(booking.userPhone, 165, currentY, { width: 80 });
    doc.text(slotInfo, 250, currentY, { width: 105 });
    doc.text(booking.bookingStatus || 'pending', 360, currentY, { width: 60 });
    doc.text(`Rs. ${advPayment}`, 425, currentY, { width: 55 });
    doc.text(`Rs. ${fullPayment}`, 485, currentY, { width: 65 });
    doc.moveDown(1.5);

    // Add new page if needed
    if (doc.y > 700) {
      doc.addPage();
    }
  });

  return doc;
};

const createSingleBookingReceipt = (booking) => {
  const doc = new PDFDocument({ margin: 50 });

  // Add Arena Branding
  const logoPath = path.join(__dirname, '../../client/public/logo.png');
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 50, 45, { width: 50 });
  }

  // Header Title
  doc
    .fillColor('#000000')
    .fontSize(20)
    .font('Helvetica-Bold')
    .text('THE TURF', 110, 57);

  doc
    .fontSize(10)
    .font('Helvetica')
    .text('Official Booking Receipt', 110, 80);

  // Divider
  doc.moveTo(50, 110).lineTo(550, 110).stroke('#E2E8F0');

  // Receipt Meta Info
  doc.fontSize(10).font('Helvetica-Bold').text('Receipt ID:', 50, 130);
  doc.font('Helvetica').text(booking.receiptId || `TRF-${new Date().getFullYear()}-${booking._id.toString().slice(-4).toUpperCase()}`, 150, 130);

  doc.font('Helvetica-Bold').text('Date Generated:', 350, 130);
  doc.font('Helvetica').text(new Date().toLocaleString(), 450, 130);

  // Subject Information
  doc.moveDown(3);
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#2563EB').text('SUBJECT INFORMATION');
  doc.moveDown(0.5);
  doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold').text('Name:', 50, doc.y);
  doc.font('Helvetica').text(booking.userName, 150, doc.y - 12);
  
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').text('Mobile:', 50, doc.y);
  doc.font('Helvetica').text(booking.userPhone, 150, doc.y - 12);

  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').text('Location:', 50, doc.y);
  doc.font('Helvetica').text(booking.turfLocation || 'Primary Arena', 150, doc.y - 12);

  // Operational Node Matrix
  doc.moveDown(2);
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#2563EB').text('OPERATIONAL NODE MATRIX');
  doc.moveDown(0.5);
  
  const slotDate = booking.slot?.date ? new Date(booking.slot.date).toLocaleDateString('en-GB') : 'N/A';
  const slotTime = booking.timeSlot || (booking.slot ? `${booking.slot.startTime} - ${booking.slot.endTime}` : 'N/A');

  doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold').text('Deployment Date:', 50, doc.y);
  doc.font('Helvetica').text(slotDate, 150, doc.y - 12);

  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').text('Time Window:', 50, doc.y);
  doc.font('Helvetica').text(slotTime, 150, doc.y - 12);

  // Financial Protocol
  doc.moveDown(2);
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#2563EB').text('FINANCIAL PROTOCOL');
  doc.moveDown(0.5);

  const advPayment = booking.paymentType === 'advance' ? booking.amount : 0;
  const totalAmount = booking.totalAmount || booking.amount;
  const balance = totalAmount - advPayment;

  doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold').text('Total Fee:', 50, doc.y);
  doc.font('Helvetica').text(`₹${totalAmount.toLocaleString()}`, 150, doc.y - 12);

  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').text('Paid Amount:', 50, doc.y);
  doc.font('Helvetica').text(`₹${booking.amount.toLocaleString()}`, 150, doc.y - 12);

  if (balance > 0) {
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').fillColor('#B91C1C').text('Pending Balance:', 50, doc.y);
    doc.font('Helvetica').text(`₹${balance.toLocaleString()}`, 150, doc.y - 12);
  }

  doc.moveDown(0.5);
  doc.fillColor('#000000').font('Helvetica-Bold').text('Payment Status:', 50, doc.y);
  doc.font('Helvetica').text(booking.paymentStatus?.toUpperCase() || 'PENDING', 150, doc.y - 12);

  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').text('Transaction ID:', 50, doc.y);
  doc.font('Helvetica').text(booking.transactionId || booking.paymentId || 'N/A', 150, doc.y - 12);

  // Footer
  doc.moveDown(4);
  doc.fontSize(8).fillColor('#64748B').text('This is a computer-generated document. Transaction verified via Neural Registry node.', { align: 'center' });
  doc.text('© 2026 THE TURF INFRASTRUCTURE GROUP', { align: 'center' });

  return doc;
};

module.exports = {
  generateBookingReport,
  createPDF,
  createSingleBookingReceipt
};


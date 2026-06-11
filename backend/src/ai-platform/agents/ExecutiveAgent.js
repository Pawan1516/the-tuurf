'use strict';
/**
 * ─── EXECUTIVE AGENT ─────────────────────────────────────────────────────────
 * Business intelligence: KPIs, revenue, growth, strategic recommendations
 * Access: admin / owner / manager roles only
 */

const mongoose = require('mongoose');

let openaiClient = null;
function setClient(client) { openaiClient = client; }

const SYSTEM_PROMPT = `You are the Executive Intelligence Agent for "The Turf" platform.
You provide strategic business insights, revenue analysis, growth recommendations, and KPI summaries.
Your audience is the business owner and management team.
Be concise, data-driven, and action-oriented. Use clear formatting with metrics.
Always suggest 2–3 strategic actions based on the data.`;

async function handle(payload) {
  const { message, intent, context } = payload;

  // ── Pull live platform metrics ─────────────────────────────────────────────
  const metrics = await getPlatformMetrics();

  if (intent === 'REVENUE_REPORT') {
    return buildRevenueReport(metrics);
  }

  if (intent === 'KPI_DASHBOARD') {
    return buildKPISummary(metrics);
  }

  if (intent === 'GROWTH_ANALYSIS') {
    return buildGrowthAnalysis(metrics);
  }

  // ── LLM-powered strategic query ───────────────────────────────────────────
  return await generateStrategicInsight(message, metrics);
}

async function getPlatformMetrics() {
  try {
    const Booking = mongoose.model('Booking');
    const User    = mongoose.model('User');

    const now   = new Date();
    const month = new Date(now.getFullYear(), now.getMonth(), 1);
    const week  = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers, newUsersThisMonth, totalBookings,
      bookingsThisMonth, bookingsThisWeek,
      confirmedBookings,
    ] = await Promise.all([
      User.countDocuments().catch(() => 0),
      User.countDocuments({ createdAt: { $gte: month } }).catch(() => 0),
      Booking.countDocuments().catch(() => 0),
      Booking.countDocuments({ createdAt: { $gte: month } }).catch(() => 0),
      Booking.countDocuments({ createdAt: { $gte: week } }).catch(() => 0),
      Booking.countDocuments({ status: 'confirmed' }).catch(() => 0),
    ]);

    const avgBookingValue = 650; // INR — from pricing config
    const monthlyRevenue  = bookingsThisMonth * avgBookingValue;
    const weeklyRevenue   = bookingsThisWeek  * avgBookingValue;

    return {
      totalUsers,
      newUsersThisMonth,
      totalBookings,
      bookingsThisMonth,
      bookingsThisWeek,
      confirmedBookings,
      monthlyRevenue,
      weeklyRevenue,
      conversionRate: totalBookings > 0 ? ((confirmedBookings / totalBookings) * 100).toFixed(1) : '0',
      avgBookingValue,
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error('[ExecutiveAgent] getPlatformMetrics error:', err.message);
    return { error: 'Metrics unavailable', generatedAt: new Date().toISOString() };
  }
}

function buildRevenueReport(m) {
  return {
    success: true,
    reply: `## 📊 Revenue Report — The Turf\n\n` +
      `**This Month:**\n` +
      `• Revenue: ₹${(m.monthlyRevenue || 0).toLocaleString('en-IN')}\n` +
      `• Bookings: ${m.bookingsThisMonth || 0} confirmed\n\n` +
      `**This Week:**\n` +
      `• Revenue: ₹${(m.weeklyRevenue || 0).toLocaleString('en-IN')}\n` +
      `• Bookings: ${m.bookingsThisWeek || 0}\n\n` +
      `**Platform Overall:**\n` +
      `• Total Bookings: ${m.totalBookings || 0}\n` +
      `• Avg Booking Value: ₹${m.avgBookingValue || 650}\n` +
      `• Conversion Rate: ${m.conversionRate || 0}%\n\n` +
      `**Strategic Actions:**\n` +
      `1. Launch weekend package deals to boost Saturday bookings\n` +
      `2. Implement loyalty discounts for users with 5+ bookings\n` +
      `3. Send re-engagement WhatsApp to users inactive for 30 days`,
    data: m,
    suggestions: ['Growth analysis', 'User metrics', 'This week KPIs'],
    actions: [{ type: 'EXPORT', label: 'Export Revenue Report (PDF)' }],
  };
}

function buildKPISummary(m) {
  return {
    success: true,
    reply: `## 🎯 KPI Dashboard — The Turf\n\n` +
      `| Metric | Value | Status |\n` +
      `|--------|-------|--------|\n` +
      `| Total Users | ${m.totalUsers || 0} | ${m.totalUsers > 100 ? '✅' : '🟡'} |\n` +
      `| New Users (Month) | ${m.newUsersThisMonth || 0} | ${m.newUsersThisMonth > 20 ? '✅' : '🟡'} |\n` +
      `| Monthly Bookings | ${m.bookingsThisMonth || 0} | ${m.bookingsThisMonth > 50 ? '✅' : '🟡'} |\n` +
      `| Conversion Rate | ${m.conversionRate || 0}% | ${parseFloat(m.conversionRate) > 60 ? '✅' : '🔴'} |\n` +
      `| Monthly Revenue | ₹${(m.monthlyRevenue || 0).toLocaleString('en-IN')} | ✅ |\n\n` +
      `**Top Recommendation:** ${parseFloat(m.conversionRate) < 60 ? 'Focus on improving booking conversion — consider adding instant confirmation and payment flexibility.' : 'Platform performing well. Focus on user acquisition through referral programs.'}`,
    data: m,
    suggestions: ['Revenue report', 'Growth trends', 'User acquisition'],
    actions: [],
  };
}

function buildGrowthAnalysis(m) {
  const userGrowthRate = m.totalUsers > 0 ? ((m.newUsersThisMonth / m.totalUsers) * 100).toFixed(1) : 0;
  return {
    success: true,
    reply: `## 📈 Growth Analysis — The Turf\n\n` +
      `**User Growth:** ${userGrowthRate}% month-over-month\n` +
      `**New Members This Month:** ${m.newUsersThisMonth || 0}\n` +
      `**Total Platform Users:** ${m.totalUsers || 0}\n\n` +
      `**Booking Growth:**\n` +
      `• This week: ${m.bookingsThisWeek || 0} bookings\n` +
      `• This month: ${m.bookingsThisMonth || 0} bookings\n\n` +
      `**Growth Opportunities:**\n` +
      `1. 🎯 **Corporate packages** — Target local companies for team outings (high LTV)\n` +
      `2. 📱 **Referral program** — Each referral = ₹100 credit (low CAC)\n` +
      `3. 🤝 **School/college tie-ups** — Weekend youth tournaments\n` +
      `4. 📊 **Dynamic pricing** — Premium slots at ₹800+, off-peak at ₹500\n\n` +
      `**Forecasted Monthly Revenue:** ₹${((m.bookingsThisMonth * 1.15) * m.avgBookingValue).toLocaleString('en-IN')} (+15% projected)`,
    data: m,
    suggestions: ['Revenue details', 'KPI dashboard', 'Set revenue target'],
    actions: [{ type: 'REPORT', label: 'Generate Full Growth Report' }],
  };
}

async function generateStrategicInsight(message, metrics) {
  if (!openaiClient) {
    return buildKPISummary(metrics);
  }

  try {
    const metricsContext = JSON.stringify(metrics, null, 2);
    const res = await openaiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT + `\n\nCurrent platform metrics:\n${metricsContext}` },
        { role: 'user', content: message },
      ],
      max_tokens: 500,
      temperature: 0.4,
    });

    return {
      success: true,
      reply: res.choices[0].message.content,
      data: metrics,
      suggestions: ['Revenue report', 'KPI dashboard', 'Growth analysis'],
      actions: [],
    };
  } catch (err) {
    console.error('[ExecutiveAgent] LLM error:', err.message);
    return buildKPISummary(metrics);
  }
}

module.exports = { handle, setClient, getPlatformMetrics };

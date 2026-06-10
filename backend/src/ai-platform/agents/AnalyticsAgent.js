'use strict';
/**
 * ─── ANALYTICS AGENT ─────────────────────────────────────────────────────────
 * Data analysis, trend detection, forecasting, KPI insights
 */
const mongoose = require('mongoose');
let openaiClient = null;
function setClient(client) { openaiClient = client; }

async function handle(payload) {
  const { message, intent } = payload;
  const data = await gatherAnalyticsData();

  if (intent === 'TREND_DETECTION') return buildTrendReport(data);
  if (intent === 'FORECAST')        return buildForecast(data);
  if (intent === 'DATA_ANALYSIS')   return buildAnalyticsReport(data);

  // LLM-driven analysis
  if (openaiClient) {
    try {
      const res = await openaiClient.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: `You are a data analytics expert for The Turf sports platform. Analyze the data and provide actionable insights.\n\nData: ${JSON.stringify(data)}` },
          { role: 'user', content: message },
        ],
        max_tokens: 500, temperature: 0.3,
      });
      return { success: true, reply: res.choices[0].message.content, data, suggestions: ['Revenue trends', 'User growth', 'Booking patterns'] };
    } catch { /* fall through */ }
  }

  return buildAnalyticsReport(data);
}

async function gatherAnalyticsData() {
  try {
    const Booking = mongoose.model('Booking');
    const User    = mongoose.model('User');
    const now = new Date();

    const [totalBookings, totalUsers, last30Days, last7Days] = await Promise.all([
      Booking.countDocuments().catch(() => 0),
      User.countDocuments().catch(() => 0),
      Booking.countDocuments({ createdAt: { $gte: new Date(now - 30*86400000) } }).catch(() => 0),
      Booking.countDocuments({ createdAt: { $gte: new Date(now - 7*86400000) } }).catch(() => 0),
    ]);

    // Sport breakdown
    const sportBreakdown = await Booking.aggregate([
      { $group: { _id: '$sport', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]).catch(() => []);

    return { totalBookings, totalUsers, last30Days, last7Days, sportBreakdown, generatedAt: now.toISOString() };
  } catch { return { error: true, generatedAt: new Date().toISOString() }; }
}

function buildAnalyticsReport(d) {
  const sportsText = (d.sportBreakdown || []).map(s => `• ${s._id || 'Unknown'}: ${s.count} bookings`).join('\n') || '• Data loading...';
  return {
    success: true,
    reply: `## 📊 Analytics Report — The Turf\n\n**Booking Metrics:**\n• Total all-time: ${d.totalBookings || 0}\n• Last 30 days: ${d.last30Days || 0}\n• Last 7 days: ${d.last7Days || 0}\n\n**User Base:** ${d.totalUsers || 0} registered users\n\n**Top Sports by Bookings:**\n${sportsText}\n\n**Insight:** ${d.last7Days > (d.last30Days / 4) ? '📈 Booking pace is accelerating this week' : '📉 Booking pace is below monthly average — consider promotions'}`,
    data: d,
    suggestions: ['Trend analysis', 'Forecast', 'Revenue breakdown', 'User growth'],
  };
}

function buildTrendReport(d) {
  const weeklyRate = d.last30Days > 0 ? ((d.last7Days / d.last30Days) * 100).toFixed(1) : 0;
  return {
    success: true,
    reply: `## 📈 Trend Detection — The Turf\n\n**This Week vs Month:** ${weeklyRate}% of monthly volume in 7 days\n${parseFloat(weeklyRate) > 25 ? '🟢 **TREND: Accelerating growth**' : parseFloat(weeklyRate) < 15 ? '🔴 **TREND: Slowdown detected**' : '🟡 **TREND: Stable, on pace**'}\n\n**Top Performing Sport:** ${d.sportBreakdown?.[0]?._id || 'Cricket'}\n\n**Recommended Actions:**\n• ${parseFloat(weeklyRate) < 20 ? 'Launch flash sale for this weekend' : 'Expand capacity for peak demand periods'}\n• Push WhatsApp reminders to inactive users\n• Feature most-booked sport on homepage`,
    data: d,
    suggestions: ['Full report', 'Revenue forecast', 'User trends'],
  };
}

function buildForecast(d) {
  const dailyAvg = d.last30Days / 30;
  const projected30 = Math.round(dailyAvg * 30 * 1.1);
  const projectedRevenue = projected30 * 650;
  return {
    success: true,
    reply: `## 🔮 30-Day Forecast — The Turf\n\n**Current Pace:** ${dailyAvg.toFixed(1)} bookings/day\n**Projected Bookings (next 30d):** ~${projected30} (+10% growth model)\n**Projected Revenue:** ₹${projectedRevenue.toLocaleString('en-IN')}\n\n**Confidence:** Medium (based on last 30-day trend)\n\n**Factors to Watch:**\n• Weekend utilization rate\n• Premium membership conversions\n• New user acquisition\n\n**Action:** To hit forecast, target ${Math.ceil(projected30 / 30)} bookings/day minimum`,
    data: { ...d, projected30, projectedRevenue },
    suggestions: ['Actual vs forecast', 'Revenue breakdown', 'Booking trends'],
  };
}

module.exports = { handle, setClient };

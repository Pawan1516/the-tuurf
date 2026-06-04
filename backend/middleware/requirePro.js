const User = require('../models/User');

/**
 * Require Pro subscription middleware
 * Expects `req.user` to be present (decoded token) or will try to load from token id.
 */
module.exports = async function requirePro(req, res, next) {
  try {
    if (!req.user || !req.user.id && !req.user._id) {
      return res.status(401).json({ success: false, message: 'Unauthenticated', code: 'UNAUTHENTICATED' });
    }

    const userId = req.user.id || req.user._id;
    const user = await User.findById(userId).select('+premiumExpiry +trialEndDate +isPremium +subscription');
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });

    // Prefer explicit subscription flag, otherwise fall back to premium expiry / trial
    const hasPro = (user.subscription && user.subscription.isPremium) || user.checkPremiumStatus();
    if (!hasPro) {
      return res.status(403).json({ success: false, message: 'Pro subscription required', code: 'PRO_REQUIRED' });
    }

    // attach full user for downstream handlers
    req.userDoc = user;
    next();
  } catch (err) {
    console.error('requirePro middleware error:', err && err.stack ? err.stack : err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

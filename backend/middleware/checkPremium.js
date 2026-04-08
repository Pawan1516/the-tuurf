const User = require('../models/User');

const checkPremium = async (req, res, next) => {
    try {
        const userId = req.user.id || req.user._id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const now = new Date();
        let isAccessGranted = false;

        // 1. Check if user has an active paid subscription
        if (user.premiumExpiry && user.premiumExpiry > now) {
            isAccessGranted = true;
        } 
        // 2. Check if user is within their 7-day free trial
        else if (user.trialEndDate && user.trialEndDate > now && user.isPremium) {
            isAccessGranted = true;
        }

        if (isAccessGranted) {
            return next();
        }

        // Auto-update isPremium flag if both expired
        if (user.isPremium) {
            user.isPremium = false;
            await user.save();
        }

        return res.status(403).json({
            success: false,
            message: 'Premium feature locked. Your trial has ended.',
            requiresUpgrade: true,
            trialExpired: true
        });
    } catch (err) {
        console.error('Premium check middleware error:', err);
        return res.status(500).json({ success: false, message: 'Internal security error' });
    }
};

module.exports = checkPremium;

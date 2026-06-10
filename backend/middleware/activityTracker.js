const sessionService = require('../services/sessionService');
const SESSION_CONFIG = require('../config/sessionConfig');

/**
 * Activity Tracker Middleware
 * Updates session activity on every request to prevent timeout
 */
const activityTracker = async (req, res, next) => {
  try {
    // Check if session ID is available
    if (req.sessionId) {
      // Update last activity timestamp
      await sessionService.updateActivity(req.sessionId);

      // Get remaining time and attach to request for optional frontend use
      const userRole = req.user?.role || 'user';
      const remainingTime = await sessionService.getRemainingTime(req.sessionId, userRole);
      
      req.remainingTime = remainingTime;
      req.warningTime = SESSION_CONFIG.WARNING_TIME;
      req.timeoutDuration = sessionService.getTimeoutForRole(userRole);
    }

    next();
  } catch (error) {
    console.error('Activity tracking error:', error);
    // Don't block request on activity tracking error
    next();
  }
};

module.exports = activityTracker;

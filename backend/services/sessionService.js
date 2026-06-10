const Session = require('../models/Session');
const SESSION_CONFIG = require('../config/sessionConfig');

class SessionService {
  /**
   * Update last activity for a session
   */
  async updateActivity(sessionId) {
    try {
      const session = await Session.findByIdAndUpdate(
        sessionId,
        { lastActivity: new Date() },
        { new: true }
      );
      return session;
    } catch (error) {
      console.error('Error updating session activity:', error);
      return null;
    }
  }

  /**
   * Get session details
   */
  async getSession(sessionId) {
    try {
      const session = await Session.findById(sessionId);
      return session;
    } catch (error) {
      console.error('Error fetching session:', error);
      return null;
    }
  }

  /**
   * Check if session is valid based on inactivity timeout
   */
  async isSessionValid(sessionId, userRole = 'user') {
    try {
      const session = await Session.findById(sessionId);

      if (!session || !session.isValid) {
        return false;
      }

      // Check if session has expired based on expiresAt
      if (session.expiresAt < new Date()) {
        session.isValid = false;
        await session.save();
        return false;
      }

      // Get timeout based on user role
      const timeout = this.getTimeoutForRole(userRole);

      // Check inactivity timeout
      const now = Date.now();
      const lastActivityTime = session.lastActivity.getTime();
      const timeSinceLastActivity = now - lastActivityTime;

      return timeSinceLastActivity < timeout;
    } catch (error) {
      console.error('Error validating session:', error);
      return false;
    }
  }

  /**
   * Get remaining time before auto-logout
   */
  async getRemainingTime(sessionId, userRole = 'user') {
    try {
      const session = await Session.findById(sessionId);

      if (!session || !session.isValid) {
        return 0;
      }

      const timeout = this.getTimeoutForRole(userRole);
      const now = Date.now();
      const lastActivityTime = session.lastActivity.getTime();
      const timeSinceLastActivity = now - lastActivityTime;

      return Math.max(0, timeout - timeSinceLastActivity);
    } catch (error) {
      console.error('Error calculating remaining time:', error);
      return 0;
    }
  }

  /**
   * Get timeout value based on user role
   */
  getTimeoutForRole(role) {
    switch (role) {
      case 'admin':
        return SESSION_CONFIG.ADMIN_INACTIVITY_TIMEOUT;
      case 'worker':
        return SESSION_CONFIG.WORKER_INACTIVITY_TIMEOUT;
      case 'user':
      case 'PLAYER':
      default:
        return SESSION_CONFIG.USER_INACTIVITY_TIMEOUT;
    }
  }

  /**
   * Get warning time
   */
  getWarningTime() {
    return SESSION_CONFIG.WARNING_TIME;
  }

  /**
   * Destroy/invalidate a session
   */
  async destroySession(sessionId) {
    try {
      const session = await Session.findByIdAndUpdate(
        sessionId,
        { isValid: false },
        { new: true }
      );
      return !!session;
    } catch (error) {
      console.error('Error destroying session:', error);
      return false;
    }
  }

  /**
   * Check and cleanup expired sessions (runs periodically)
   */
  async cleanupExpiredSessions() {
    try {
      const result = await Session.updateMany(
        {
          $or: [
            { expiresAt: { $lt: new Date() } },
            { isValid: false }
          ]
        },
        { isValid: false }
      );

      console.log(`🧹 Cleaned up ${result.modifiedCount} expired sessions`);
      return result.modifiedCount;
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error);
      return 0;
    }
  }

  /**
   * Get all active sessions for a user
   */
  async getActiveSessions(userId) {
    try {
      const sessions = await Session.find({
        userId,
        isValid: true,
        expiresAt: { $gt: new Date() }
      }).sort({ lastActivity: -1 });

      return sessions;
    } catch (error) {
      console.error('Error fetching active sessions:', error);
      return [];
    }
  }
}

module.exports = new SessionService();

// Session timeout configuration for auto-logout feature
const SESSION_CONFIG = {
  // Regular user timeout (1 hour)
  USER_INACTIVITY_TIMEOUT: 60 * 60 * 1000, // 1 hour in milliseconds
  
  // Admin timeout (1 hour)
  ADMIN_INACTIVITY_TIMEOUT: 60 * 60 * 1000, // 1 hour in milliseconds
  
  // Worker timeout (1 hour)
  WORKER_INACTIVITY_TIMEOUT: 60 * 60 * 1000, // 1 hour in milliseconds
  
  // Warning displayed at 55 minutes (5 minutes before logout)
  WARNING_TIME: 55 * 60 * 1000, // milliseconds
  
  // Check interval for session validity (every 1 minute)
  CHECK_INTERVAL: 1 * 60 * 1000, // milliseconds
  
  // Refresh token duration (7 days)
  REFRESH_TOKEN_DURATION: 7 * 24 * 60 * 60 * 1000,
  
  // Access token duration (1 hour) - should match JWT token expiry
  ACCESS_TOKEN_DURATION: 60 * 60 * 1000
};

module.exports = SESSION_CONFIG;

const jwt = require('jsonwebtoken');
const { AppError } = require('./errorHandler');
const responseHandler = require('../utils/responseHandler');
const prisma = require('../config/database');
const sessionService = require('../services/sessionService');

// Verify JWT Token
const verifyToken = (token, secret) => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    throw new AppError('Invalid or expired token', 401);
  }
};

// Protect route - verify JWT token
const protect = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null;

    if (!token) {
      return responseHandler.unauthorized(res, 'No token provided');
    }

    // Verify token
    const decoded = verifyToken(token, process.env.JWT_SECRET);
    
    // Check if session is still valid (for auto-logout)
    const session = await sessionService.isSessionValid(decoded.id);
    if (!session) {
      return responseHandler.unauthorized(res, 'Session expired');
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user || !user.isActive) {
      return responseHandler.unauthorized(res, 'User not found or inactive');
    }

    // Update last activity
    await sessionService.updateActivity(decoded.id);

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    if (error.message.includes('expired')) {
      return responseHandler.unauthorized(res, 'Token expired');
    }
    return responseHandler.unauthorized(res, error.message || 'Unauthorized');
  }
};

// Verify role - check if user has required role
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return responseHandler.unauthorized(res, 'User not authenticated');
    }

    if (!allowedRoles.includes(req.user.role)) {
      return responseHandler.forbidden(res, 'You do not have permission to access this resource');
    }

    next();
  };
};

// Admin only
const adminOnly = authorize('SUPER_ADMIN');

// Tournament Admin or Super Admin
const tournamentAdmin = authorize('SUPER_ADMIN', 'TOURNAMENT_ADMIN');

// Scorer only
const scorerOnly = authorize('SCORER', 'SUPER_ADMIN');

// Umpire only
const umpireOnly = authorize('UMPIRE', 'SUPER_ADMIN');

// Team Captain only
const captainOnly = authorize('TEAM_CAPTAIN', 'SUPER_ADMIN');

// Player only
const playerOnly = authorize('PLAYER', 'SUPER_ADMIN');

// Optional auth - doesn't fail if token is missing
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null;

    if (token) {
      const decoded = verifyToken(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
      });

      if (user && user.isActive) {
        req.user = user;
        req.token = token;
      }
    }

    next();
  } catch (error) {
    // Continue without auth
    next();
  }
};

// Verify API Key (for internal services)
const verifyApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== process.env.INTERNAL_API_KEY) {
    return responseHandler.unauthorized(res, 'Invalid API key');
  }

  next();
};

module.exports = {
  protect,
  authorize,
  adminOnly,
  tournamentAdmin,
  scorerOnly,
  umpireOnly,
  captainOnly,
  playerOnly,
  optionalAuth,
  verifyApiKey,
  verifyToken,
};

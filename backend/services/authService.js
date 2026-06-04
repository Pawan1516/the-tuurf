const jwt = require('jsonwebtoken');
const Session = require('../models/Session');
const crypto = require('crypto');

const generateTokens = async (user, role, req) => {
    // 1. Generate Access Token (Short-lived: 1h)
    const accessToken = jwt.sign(
        { id: user._id, role: role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );

    // 2. Generate Refresh Token (Opaque: 7d)
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // 3. Store Session in Database
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection.remoteAddress;

    const session = new Session({
        userId: user._id,
        onModel: role === 'admin' ? 'Admin' : (role === 'worker' ? 'Worker' : 'User'),
        role: role,
        refreshToken: refreshToken,
        userAgent,
        ipAddress,
        expiresAt
    });

    await session.save();

    return { accessToken, refreshToken };
};

const rotateRefreshToken = async (oldRefreshToken, req) => {
    // Find active session
    const session = await Session.findOne({ refreshToken: oldRefreshToken, isValid: true });

    if (!session) {
        // 🚨 SECURITY ALERT: Potential Refresh Token Reuse Attack!
        // If a token is presented but not found, someone might be using an old/stolen token.
        // As a safety measure, we could revoke ALL sessions for the user associated with this token if we knew it.
        throw new Error('REUSE_DETECTED');
    }

    if (session.expiresAt < new Date()) {
        session.isValid = false;
        await session.save();
        throw new Error('SESSION_EXPIRED');
    }

    // Generate new tokens
    const accessToken = jwt.sign(
        { id: session.userId, role: session.role || session.onModel.toLowerCase() },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );

    const newRefreshToken = crypto.randomBytes(40).toString('hex');
    
    // Rotate: Invalidate old, create new OR update current
    session.refreshToken = newRefreshToken;
    session.lastActivity = new Date();
    await session.save();

    return { accessToken, refreshToken: newRefreshToken };
};

module.exports = {
    generateTokens,
    rotateRefreshToken
};

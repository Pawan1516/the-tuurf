const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const crypto = require('crypto');
const Admin = require('../models/Admin');
const Worker = require('../models/Worker');
const User = require('../models/User');
const { sendWhatsAppNotification } = require('../services/whatsapp');
const QRService = require('../services/qrService');

const { sendOTPEmail } = require('../services/email');
const OTP = require('../models/OTP');
const Session = require('../models/Session');
const { generateTokens, rotateRefreshToken } = require('../services/authService');
const cookieParser = require('cookie-parser');
const securityLogger = require('../utils/securityLogger');
const { authLimiter } = require('../middleware/security');

// @route   POST /api/auth/send-register-otp
router.post('/send-register-otp', authLimiter, async (req, res) => {
    try {
        const { email } = req.body;
        console.log('📡 [REQUISITION] Starting Enrollment OTP for:', email);
        if (!email) return res.status(400).json({ success: false, message: 'Email address required.' });

        // Check if roster already exists
        const existingUser = await User.findOne({ email });
        if (existingUser && existingUser.isVerified) {
            console.warn('⚠️ [IDENTITY] Email already linked to an active player roster:', email);
            return res.status(400).json({ success: false, message: 'This identity is already verified in our roster.' });
        }

        // Generate and Bind security OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await OTP.deleteMany({ email });
        const otpRecord = new OTP({ email: email.toLowerCase(), otp });
        await otpRecord.save();
        console.log('🛡️ [DATABASE] Security code bound to identity secret.');

        const emailResult = await sendOTPEmail(email, otp);
        if (!emailResult.success) {
            console.error('🔥 [REGISTRAR] Brevo delivery failure:', emailResult.error);
            return res.status(500).json({ success: false, message: 'Could not send verification email. Please try again.' });
        }

        res.json({ success: true, message: 'Verification code sent to your email.' });
    } catch (err) {
        console.error('🔥 REGISTER DISPATCH ERROR:', err);
        res.status(500).json({ success: false, message: `Registrar dispatch failure: ${err.message}` });
    }
});

// @route   POST /api/auth/register-verify
router.post('/register-verify', authLimiter, async (req, res) => {
    try {
        const { name, email, phone, password, otp } = req.body;
        
        // 1. Verify OTP
        const validOTP = await OTP.findOne({ email: email.toLowerCase(), otp });
        if (!validOTP) {
            return res.status(401).json({ success: false, message: 'Invalid or expired pass code.' });
        }

        // 2. Clear OTP
        await OTP.deleteMany({ email: email.toLowerCase() });

        // 3. Create/Update User
        // Sanitize phone — strip non-digits and country code
        const cleanPhone = (phone || '').replace(/\D/g, '').replace(/^91/, '').slice(-10) || '0000000000';

        let user = await User.findOne({ email: email.toLowerCase() });
        if (user) {
            user.name = name;
            user.phone = cleanPhone;
            user.password = password;
            user.isVerified = true;
        } else {
            user = new User({ name, email: email.toLowerCase(), phone: cleanPhone, password, isVerified: true });
        }
        await user.save();

        // 4. Issue Enterprise Tokens
        const { accessToken, refreshToken } = await generateTokens(user, user.role, req);

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({ 
            success: true, 
            token: accessToken, 
            user: { id: user._id, email: user.email, name: user.name, role: user.role } 
        });
    } catch (err) {
        console.error('🔥 [REGISTER-VERIFY] Full error:', err.name, err.message, err.errors);

        // Handle duplicate key error (e.g., unique phone number)
        if (err.code === 11000) {
            const field = Object.keys(err.keyPattern)[0];
            return res.status(400).json({ 
                success: false, 
                message: `This ${field} is already registered to another roster record.` 
            });
        }

        // Resolve common Mongoose validation errors clearly
        if (err.name === 'ValidationError') {
            const fields = Object.keys(err.errors).join(', ');
            return res.status(400).json({ success: false, message: `Validation failed: ${fields}` });
        }
        res.status(500).json({ success: false, message: 'Registration confirmation failed.' });
    }
});

// @route   POST /api/auth/resend-otp
router.post('/resend-otp', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: 'Email address required.' });

        const lastOTP = await OTP.findOne({ email: email.toLowerCase() }).sort({ createdAt: -1 });
        if (lastOTP && (Date.now() - lastOTP.createdAt < 30000)) {
            return res.status(429).json({ success: false, message: 'Wait 30s before requesting a new code.' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await OTP.deleteMany({ email: email.toLowerCase() });
        await new OTP({ email: email.toLowerCase(), otp }).save();

        const emailResult = await sendOTPEmail(email, otp);
        if (!emailResult.success) {
            console.error('🔥 [RESEND] Brevo delivery failure:', emailResult.error);
            return res.status(500).json({ success: false, message: 'Could not resend verification email. Please try again.' });
        }

        res.json({ success: true, message: 'New verification code sent to your email.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Resend sequence failure.' });
    }
});

// @route   POST /api/auth/login
// @route   POST /api/auth/quick-login
// 🔓 Requirement: No OTP login → only mobile number
router.post('/quick-login', authLimiter, async (req, res) => {
    try {
        const { phone, name } = req.body;
        if (!phone) return res.status(400).json({ success: false, message: 'Mobile number required.' });

        const cleanPhone = phone.replace(/\D/g, '').replace(/^91/, '').slice(-10);
        let user = await User.findOne({ phone: cleanPhone });

        if (!user) {
            // Store user name + mobile in DB
            user = new User({
                name: name || `Player_${cleanPhone.slice(-4)}`,
                phone: cleanPhone,
                password: crypto.randomBytes(16).toString('hex'), // Secure random fallback
                role: 'PLAYER',
                isVerified: true
            });
            await user.save();
        }

        const { accessToken, refreshToken } = await generateTokens(user, user.role, req);
        
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({ 
            success: true, 
            token: accessToken, 
            user: { id: user._id, name: user.name, role: user.role } 
        });
    } catch (err) {
        console.error('Quick Login Error:', err);
        res.status(500).json({ success: false, message: 'Direct access failure.' });
    }
});

router.post('/login', authLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;
        const identifier = email; // email field can be email or phone
        
        let query = {};
        if (identifier.includes('@')) {
            query = { email: identifier.toLowerCase() };
        } else {
            // Assume phone if no @
            const cleanPhone = identifier.replace(/\D/g, '').replace(/^91/, '').slice(-10);
            query = { phone: cleanPhone };
        }

        let user = null;
        let role = null;

        // 1. Check User Collection (Players)
        user = await User.findOne(query).select('+password');
        if (user) {
            role = user.role || 'PLAYER';
        }

        // 2. Check Admin Collection
        if (!user) {
            user = await Admin.findOne(query).select('+password');
            if (user) {
                role = 'admin';
            }
        }

        // 3. Check Worker Collection
        if (!user) {
            user = await Worker.findOne(query).select('+password');
            if (user) {
                role = 'worker';
            }
        }
        
        if (!user) {
            return res.status(401).json({ success: false, message: 'Roster record not found.' });
        }

        // Verification check only for Players
        if (role === 'PLAYER' && !user.isVerified) {
            return res.status(401).json({ success: false, message: 'Identity verification pending.' });
        }

        if (user.isLocked) {
            securityLogger('AUTH_LOCKOUT', { email: user.email, phone: user.phone, ip: req.ip });
            return res.status(403).json({ success: false, message: 'Account temporarily locked due to multiple failed attempts. Please try again in 15 minutes.' });
        }

        // --- ADMIN HIGH-SECURE PROTOCOL ---
        if (role === 'admin') {
            const adminKey = req.body.admin_key || req.headers['x-admin-key'];
            const masterKey = process.env.ADMIN_MASTER_KEY || 'TURF_PRO_2026_SECURE'; // Hard fallback for initial setup
            // If an adminKey is provided, validate it; otherwise, allow login without it (fallback for development)
            if (adminKey && adminKey !== masterKey) {
                await user.incLoginAttempts();
                securityLogger('ADMIN_AUTH_KEY_FAIL', { email: user.email, ip: req.ip });
                return res.status(401).json({ 
                    success: false, 
                    message: 'Administrative clearance failed: Invalid Master Key.' 
                });
            }
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            await user.incLoginAttempts();
            const updatedUser = await user.constructor.findById(user._id);
            const remaining = Math.max(0, 5 - updatedUser.loginAttempts);
            
            securityLogger('AUTH_FAILURE', { email: user.email, phone: user.phone, ip: req.ip, attempts: updatedUser.loginAttempts });
            
            let message = 'Access key mismatch.';
            if (remaining > 0) {
                message += ` ${remaining} attempts remaining before account lockout.`;
            } else {
                message = 'Account locked due to too many failed attempts. Please try again in 15 minutes.';
            }
            
            return res.status(401).json({ success: false, message });
        }

        // Reset login attempts on success
        await user.updateOne({ $set: { loginAttempts: 0 }, $unset: { lockUntil: 1 } });
        
        const finalRole = user.role || role;
        securityLogger('AUTH_SUCCESS', { userId: user._id, role: finalRole, ip: req.ip });

        // --- Auto-link bookings on login ---
        if (finalRole === 'PLAYER' && (user.phone || user.mobileNumber)) {
            const cleanPhone = (user.phone || user.mobileNumber).replace(/\D/g, '').replace(/^91/, '').slice(-10);
            console.log(`[DEBUG] Attempting to auto-link bookings for ${cleanPhone}`);
            try {
                const Booking = require('../models/Booking');
                const linkResult = await Booking.updateMany(
                    {
                        $and: [
                            { 
                                $or: [
                                    { mobileNumber: cleanPhone },
                                    { userPhone: { $regex: cleanPhone } }
                                ] 
                            },
                            { 
                                $or: [
                                    { userId: null }, 
                                    { userId: { $exists: false } }, 
                                    { user: null }, 
                                    { user: { $exists: false } }
                                ] 
                            }
                        ]
                    },
                    {
                        $set: {
                            userId: user._id,
                            user: user._id
                        }
                    }
                );
                if (linkResult.modifiedCount > 0) {
                    console.log(`[DEBUG] Successfully auto-linked ${linkResult.modifiedCount} bookings for user ${user._id}`);
                }
            } catch (linkError) {
                console.error('[Login] Auto-link error:', linkError.message);
            }
        }
        
        const { accessToken, refreshToken } = await generateTokens(user, finalRole, req);

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({ 
            success: true, 
            token: accessToken, 
            user: { 
                id: user._id, 
                email: user.email, 
                name: user.name, 
                phone: user.phone, 
                role: finalRole, 
                isPremium: user.isPremium 
            } 
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, message: 'System login failure.' });
    }
});

// @route   POST /api/auth/send-login-otp
router.post('/send-login-otp', authLimiter, async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ success: false, message: 'Phone required.' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 10 * 60 * 1000);

        let user = await User.findOne({ phone });
        if (!user) {
            user = new User({
                name: `Player_${phone.slice(-4)}`,
                phone,
                password: crypto.randomBytes(16).toString('hex'),
                role: 'PLAYER'
            });
        }
        
        user.otpCode = otp;
        user.otpExpires = expires;
        await user.save();

        const message = `🏏 *The Turf Verification* \n\nYour security access code is: *${otp}*\n_Valid for 10 minutes._`;
        try {
            await sendWhatsAppNotification(phone, message, null, 'otp');
        } catch (waError) {
            console.warn('WhatsApp service error:', waError.message);
        }

        console.log(`📡 OTP for ${phone}: ${otp}`);
        res.json({ success: true, message: 'OTP dispatched.', phone });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
    try {
        const { phone, code } = req.body;
        if (!phone || !code) return res.status(400).json({ success: false, message: 'Phone and Code required.' });

        let verifiedPhone = phone;
        let isVerified = false;

        // 🛡️ Option 1: Firebase ID Token (Length > 100)
        if (code.length > 100) {
            try {
                const admin = require('../services/firebase');
                const decodedToken = await admin.auth().verifyIdToken(code);
                // Decoded phone is usually "+91XXXXXXXXXX"
                const fbPhone = decodedToken.phone_number?.replace('+91', '');
                if (fbPhone && fbPhone === phone) {
                    isVerified = true;
                } else {
                    return res.status(401).json({ success: false, message: 'Identity Token Mismatch.' });
                }
            } catch (fbError) {
                console.warn('Firebase Token Fail:', fbError.message);
                // Optional: Fallback if Admin SDK is not fully set up but we are in dev
                if (process.env.NODE_ENV === 'development') { 
                        isVerified = true; // Temporary trust for local dev 🛡️
                        console.warn('⚠️ Development Mode: Bypassing Firebase Verification.');
                } else {
                    return res.status(401).json({ success: false, message: 'Session Verification Failed.' });
                }
            }
        } else {
            // 🛡️ Option 2: Legacy SIM/Internal Code
            const userForOtp = await User.findOne({ phone }).select('+otpCode +otpExpires');
            const isSimulated = process.env.NODE_ENV === 'development' && code === '123456';
            const isMatch = userForOtp && userForOtp.otpCode === code && userForOtp.otpExpires > new Date();
            if (isSimulated || isMatch) {
                isVerified = true;
            } else {
                return res.status(401).json({ success: false, message: 'Invalid or expired code.' });
            }
        }

        if (!isVerified) return res.status(401).json({ success: false, message: 'Critical Identity failure.' });

        let user = await User.findOne({ phone });
        if (!user) {
            user = new User({
                name: `Player_${phone.slice(-4)}`,
                phone,
                password: crypto.randomBytes(16).toString('hex'),
                role: 'PLAYER',
                isPhoneVerified: true
            });
        }
        
        user.isPhoneVerified = true;
        user.otpCode = undefined;
        user.otpExpires = undefined;
        
        // Try to generate QR, but don't block login if it fails
        try {
            if (!user.player_qr || !user.player_qr.code) {
                const qrData = await QRService.generatePlayerQR(user);
                user.player_qr = {
                    code: qrData.encodedData,
                    qr_image_url: qrData.qrImage,
                    generated_at: qrData.generatedAt
                };
            }
        } catch (qrErr) {
            console.warn('QR generation skipped:', qrErr.message);
        }
        
        await user.save();
        const payload = { id: user._id, role: user.role };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
            if (err) throw err;
            res.json({ success: true, token, role: user.role, user: { id: user._id, name: user.name, phone: user.phone, role: user.role } });
        });
    } catch (err) {
        console.error('verify-otp error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

router.post('/register', async (req, res) => {
    const { name, email, phone, password } = req.body;
    try {
        if (!name || !phone || !password) {
            return res.status(400).json({ success: false, message: 'Name, phone and password are required.' });
        }
        if (!/^[0-9]{10}$/.test(phone)) {
            return res.status(400).json({ success: false, message: 'Please provide a valid 10-digit phone number.' });
        }
        // Check phone uniqueness
        const existingPhone = await User.findOne({ phone });
        if (existingPhone) return res.status(400).json({ success: false, message: 'This mobile number is already registered. Please login.' });
        // Check email uniqueness only if email provided
        if (email) {
            const existingEmail = await User.findOne({ email });
            if (existingEmail) return res.status(400).json({ success: false, message: 'This email is already registered.' });
        }
        const user = new User({ name, phone, password, ...(email ? { email } : {}) });
        await user.save();
        const payload = { id: user._id, role: user.role };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
            if (err) throw err;
            res.status(201).json({ success: true, token, role: user.role, user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role } });
        });
    } catch (err) {
        console.error('Register error:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
});

router.post('/google', async (req, res) => {
    const { email, name, uid } = req.body;
    try {
        if (!email) return res.status(400).json({ success: false, message: 'Google email is required.' });

        let user = await User.findOne({ email });
        let userRole = 'PLAYER';

        if (!user) {
            // Check if this email belongs to an Admin or Worker
            user = await Admin.findOne({ email });
            if (user) {
                userRole = 'ADMIN';
            } else {
                user = await Worker.findOne({ email });
                if (user) {
                    userRole = 'WORKER';
                }
            }
        } else {
            userRole = user.role || 'PLAYER';
        }
        
        if (!user) {
            // New user via Google
            // Generate a unique placeholder phone (999XXXXXXXX) to satisfy model requirement 
            // until user updates it in their profile
            let tempPhone = '999' + Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
            
            // Ensure this temp phone is actually unique (highly likely but safety first)
            let phoneExists = await User.findOne({ phone: tempPhone });
            while (phoneExists) {
                tempPhone = '999' + Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
                phoneExists = await User.findOne({ phone: tempPhone });
            }

            user = new User({
                name: name || email.split('@')[0],
                email,
                phone: tempPhone,
                password: crypto.randomBytes(32).toString('hex'),
                realPassword: 'Google OAuth Account',
                role: 'PLAYER' // Default to PLAYER for new Google users
            });
            await user.save();
        }

        const payload = { id: user._id, role: userRole };

        // --- Auto-link bookings on Google login ---
        if (userRole === 'PLAYER' && (user.phone || user.mobileNumber)) {
            const cleanPhone = (user.phone || user.mobileNumber).replace(/\D/g, '').replace(/^91/, '').slice(-10);
            console.log(`[DEBUG] Attempting to auto-link bookings for ${cleanPhone} (Google)`);
            try {
                const Booking = require('../models/Booking');
                const linkResult = await Booking.updateMany(
                    {
                        $and: [
                            { 
                                $or: [
                                    { mobileNumber: cleanPhone },
                                    { userPhone: { $regex: cleanPhone } }
                                ] 
                            },
                            { 
                                $or: [
                                    { userId: null }, 
                                    { userId: { $exists: false } }, 
                                    { user: null }, 
                                    { user: { $exists: false } }
                                ] 
                            }
                        ]
                    },
                    {
                        $set: {
                            userId: user._id,
                            user: user._id
                        }
                    }
                );
                if (linkResult.modifiedCount > 0) {
                    console.log(`[DEBUG] Successfully auto-linked ${linkResult.modifiedCount} bookings for user ${user._id}`);
                }
            } catch (linkError) {
                console.error('[Google-Login] Auto-link error:', linkError.message);
            }
        }

        const { accessToken, refreshToken } = await generateTokens(user, userRole, req);

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({ 
            success: true, 
            token: accessToken, 
            role: userRole, 
            user: { 
                id: user._id, 
                name: user.name, 
                email: user.email, 
                phone: user.phone,
                role: userRole
            } 
        });
    } catch (err) {
        console.error('Google login error:', err);
        res.status(500).json({ success: false, message: 'Internal server error during Google login.' });
    }
});

const verifyToken = require('../middleware/verifyToken');
router.get('/profile', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        let user = await User.findById(userId).select('-password -realPassword -otpCode -otpExpires');
        if (!user) { user = await Admin.findById(userId).select('-password').lean(); }
        if (!user) { user = await Worker.findById(userId).select('-password').lean(); }
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        
        // Sync premium status based on trial/expiry (PLAYER only)
        if (typeof user.checkPremiumStatus === 'function') {
            const currentPremium = user.checkPremiumStatus();
            if (user.isPremium !== currentPremium) {
                user.isPremium = currentPremium;
                await user.save();
            }
        }

        res.json({ success: true, user });
    } catch (err) {
        console.error('[AUTH PROFILE ERROR]', err && err.stack ? err.stack : err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Development-only: debug profile (bypass auth) to aid local UI testing
router.get('/profile/debug', async (req, res) => {
    if (process.env.NODE_ENV !== 'development') return res.status(404).json({ success: false, message: 'Not found' });
    try {
        const sample = {
            id: '000000000000000000000000',
            email: 'dev@theturf.local',
            name: 'Local Dev',
            role: 'admin',
            isPremium: false
        };
        res.json({ success: true, user: sample });
    } catch (err) {
        console.error('[AUTH DEBUG ERROR]', err && err.stack ? err.stack : err);
        res.status(500).json({ success: false, message: 'Debug profile failed.' });
    }
});

router.put('/profile', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { name, phone, cricket_profile, personal } = req.body;

        // Validate phone if provided
        if (phone && !/^[0-9]{10}$/.test(phone)) {
            return res.status(400).json({ success: false, message: 'Invalid phone number. Must be 10 digits.' });
        }

        // Check if phone is already taken by another user
        if (phone) {
            const existing = await User.findOne({ phone, _id: { $ne: userId } });
            if (existing) {
                return res.status(400).json({ success: false, message: 'This mobile number is already linked to another account.' });
            }
        }

        const updateData = {};
        if (name) updateData.name = name;
        if (phone) updateData.phone = phone;
        if (personal) updateData.personal = personal;

        // Use dot-notation for cricket_profile to avoid full sub-doc replacement validation
        if (cricket_profile) {
            const allowed = {
                primary_role: ['Batsman', 'Bowler', 'All-rounder', 'Wicketkeeper'],
                batting_style: ['Right-hand bat', 'Left-hand bat'],
                bowling_style: ['Right-arm fast', 'Right-arm medium', 'Right-arm offbreak', 'Right-arm legbreak', 'Left-arm fast', 'Left-arm medium', 'Left-arm orthodox', 'Left-arm chinaman', 'None'],
            };
            for (const [key, validValues] of Object.entries(allowed)) {
                if (cricket_profile[key]) {
                    if (!validValues.includes(cricket_profile[key])) {
                        return res.status(400).json({ success: false, message: `Invalid value '${cricket_profile[key]}' for ${key}. Allowed: ${validValues.join(', ')}` });
                    }
                    updateData[`cricket_profile.${key}`] = cricket_profile[key];
                }
            }
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true }
        ).select('-password -realPassword -otpCode -otpExpires');

        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        res.json({ success: true, message: 'Profile updated successfully.', user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.post('/update-fcm-token', verifyToken, async (req, res) => {
    try {
        const { fcmToken } = req.body;
        if (!fcmToken) return res.status(400).json({ success: false, message: 'FCM Token required.' });

        const userId = req.user.id || req.user._id;
        const user = await User.findByIdAndUpdate(userId, { fcmToken }, { new: true });
        
        if (!user) {
            // Check Admin/Worker too if needed, but usually push is for users
            const admin = await Admin.findByIdAndUpdate(userId, { fcmToken }, { new: true });
            if (!admin) {
                const worker = await Worker.findByIdAndUpdate(userId, { fcmToken }, { new: true });
                if (!worker) return res.status(404).json({ success: false, message: 'User not found' });
            }
        }

        res.json({ success: true, message: 'FCM Token updated' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
    const rfToken = req.cookies.refreshToken;
    if (!rfToken) {
        return res.status(401).json({ success: false, message: 'No refresh token provided.' });
    }

    try {
        const { accessToken, refreshToken } = await rotateRefreshToken(rfToken, req);
        securityLogger('TOKEN_REFRESH', { ip: req.ip });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({ success: true, token: accessToken });
    } catch (err) {
        securityLogger('REFRESH_FAILURE', { message: err.message, ip: req.ip });
        if (err.message === 'REUSE_DETECTED') {
            // Potential theft - clear all sessions for safety if we had user context
            return res.status(403).json({ success: false, message: 'Security breach detected. Please login again.' });
        }
        res.status(401).json({ success: false, message: 'Session expired.' });
    }
});

// @route   POST /api/auth/logout
router.post('/logout', async (req, res) => {
    try {
        const rfToken = req.cookies.refreshToken;
        if (rfToken) {
            await Session.findOneAndUpdate({ refreshToken: rfToken }, { isValid: false });
        }
        res.clearCookie('refreshToken');
        res.json({ success: true, message: 'Logged out successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Logout failure.' });
    }
});

// @route   POST /api/auth/logout-all
router.post('/logout-all', verifyToken, async (req, res) => {
    try {
        await Session.updateMany({ userId: req.user.id }, { isValid: false });
        res.clearCookie('refreshToken');
        res.json({ success: true, message: 'All sessions terminated.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Global logout failure.' });
    }
});

module.exports = router;

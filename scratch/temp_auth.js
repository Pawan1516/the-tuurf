const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const verifyToken = require('../middleware/verifyToken');
const Booking = require('../models/Booking');

// --- HELPER TO CLEAN PHONE ---
const cleanPhoneNumber = (phone) => {
    if (!phone) return null;
    return phone.replace(/\D/g, '').replace(/^91/, '').slice(-10);
};

/**
 * @route   POST /api/auth/login
 * @desc    Standard email/password login
 */
router.post('/login', async (req, res) => {
    const { email, password, role } = req.body;

    try {
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        if (role === 'PLAYER' && !user.isVerified) {
            return res.status(401).json({ success: false, message: 'Identity verification pending.' });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Access key mismatch.' });
        }

        const finalRole = user.role || role;

        // --- Auto-link bookings on login ---
        if (finalRole === 'PLAYER') {
            const cleanPhone = cleanPhoneNumber(user.phone || user.mobileNumber);
            if (cleanPhone) {
                console.log(`[DEBUG] Attempting to auto-link bookings for mobile: ${cleanPhone}`);
                try {
                    const linkResult = await Booking.updateMany(
                        {
                            $and: [
                                {
                                    $or: [
                                        { mobileNumber: cleanPhone },
                                        { userPhone: cleanPhone },
                                        { userPhone: { $regex: cleanPhone } }
                                    ]
                                },
                                {
                                    $or: [
                                        { userId: { $exists: false } },
                                        { userId: null },
                                        { user: { $exists: false } },
                                        { user: null }
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
        }

        const payload = { id: user._id, role: finalRole };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '14d' }, (err, token) => {
            if (err) throw err;
            res.json({
                success: true,
                token,
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: finalRole,
                    phone: user.phone,
                    mobileNumber: user.mobileNumber,
                    cricket_profile: user.cricket_profile,
                    isPremium: user.isPremium,
                    score: user.score
                }
            });
        });

    } catch (err) {
        console.error('Login Error:', err.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

/**
 * @route   POST /api/auth/google-login
 * @desc    Google OAuth login
 */
router.post('/google-login', async (req, res) => {
    const { token } = req.body;
    // ... rest of the code should be preserved ...
});

// Since I am rewriting the file, I should really just use replace_file_content carefully.
// I will not rewrite the whole file because it is 600+ lines.
// I will use absolute replacement for the broken segment.

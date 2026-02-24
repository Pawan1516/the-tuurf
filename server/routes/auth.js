const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const Worker = require('../models/Worker');
const User = require('../models/User');



// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
    const { name, email, phone, password } = req.body;

    // Check for missing fields
    if (!name || !email || !phone || !password) {
        return res.status(400).json({ success: false, message: 'Registry criteria not met: name, email, phone, and password are required.' });
    }

    try {
        let user = await User.findOne({ email }).maxTimeMS(2000);
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        user = new User({
            name,
            email,
            phone,
            password
        });

        await user.save();

        const payload = {
            id: user._id,
            role: user.role,
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '7d' },
            (err, token) => {
                if (err) throw err;
                res.status(201).json({
                    success: true,
                    token,
                    role: user.role,
                    user: {
                        id: user._id,
                        name: user.name,
                        email: user.email,
                        phone: user.phone,
                        role: user.role
                    }
                });
            }
        );
    } catch (err) {
        console.error(err.message);
        const errorMsg = err.message.includes('buffering timed out') || err.message.includes('timeout')
            ? 'Database connection error. Please ensure your IP is whitelisted in MongoDB Atlas.'
            : 'Server Error';
        res.status(500).json({ success: false, message: errorMsg });
    }
});

// @route   POST /api/auth/login
// @desc    Login user (User, Worker, or Admin) - REQUIRES MONGODB
// @access  Public
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // Check for missing fields
    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Authentication failed: Email and password are required for verification.' });
    }

    try {
        // If DB not connected, don't even try and fail fast
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({
                success: false,
                message: 'Database currently offline. Please try again later.'
            });
        }

        // Check in User collection
        let user = await User.findOne({ email }).maxTimeMS(2000);
        let userType = 'user';

        // If not found, check Admin
        if (!user) {
            user = await Admin.findOne({ email }).maxTimeMS(2000);
            userType = 'admin';
        }

        // If still not found, check Worker
        if (!user) {
            user = await Worker.findOne({ email }).maxTimeMS(2000);
            userType = 'worker';
        }

        // User not found in any collection
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        // Generate Token
        const payload = {
            id: user._id,
            role: user.role,
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '7d' },
            (err, token) => {
                if (err) throw err;
                res.json({
                    success: true,
                    token,
                    role: user.role,
                    user: {
                        id: user._id,
                        name: user.name,
                        email: user.email,
                        role: user.role
                    }
                });
            }
        );
    } catch (err) {
        console.error('Login error:', err);
        const errorMsg = err.message.includes('buffering timed out') || err.message.includes('timeout')
            ? 'Database connection error. Please try again later.'
            : 'Server Error';
        res.status(500).json({ success: false, message: errorMsg });
    }
});

module.exports = router;


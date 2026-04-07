const express = require('express');
const router = express.Router();
const PageConfig = require('../models/PageConfig');
const verifyToken = require('../middleware/verifyToken');
const Admin = require('../models/Admin');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Slot = require('../models/Slot');
const Match = require('../models/Match');

// @route   GET /api/config/:pageName
// @desc    Get dynamic page configuration
// @access  Public
router.get('/:pageName', async (req, res) => {
    try {
        let config = await PageConfig.findOne({ pageName: req.params.pageName });
        
        // Return default if not found
        if (!config && req.params.pageName === 'home') {
            config = {
                pageName: 'home',
                hero: {
                    title: 'Feel Free',
                    highlight: 'Play Better',
                    subtext: 'Select your squad. Lock your slot',
                    images: [
                        'https://lh3.googleusercontent.com/p/AF1QipNPrYKn27LUcosUUL_CKc_0kJAwvZidmXHu1fQI=w426-h240-k-no',
                        'https://lh3.googleusercontent.com/p/AF1QipMsbwyFcmcNneeEsp6NfnXw27Ovyk38W3LqHRk_=w203-h114-k-no',
                        'https://lh3.googleusercontent.com/gps-cs-s/AHVAwepkoP29RPlPNGboLneeOgvbhpHEwA99AxCpM55ViIdwNpOmphYvagNoffmNoh8g6xJ52bLQCmpLWMh1MxvnOZixgrwC8qCtHVvW5STmUmO_pWnP3Tem2-ceTSUzPnUxUazvfe1NBw=w203-h152-k-no',
                        'https://lh3.googleusercontent.com/p/AF1QipOn7CkSrcWUs8IeOSKZFX0MT1NMp37Evqr1sSPZ=w203-h152-k-no'
                    ],
                    buttonText: 'Book Now'
                },
                about: {
                    title: 'The Turf Miyapur',
                    description: 'Welcome to Hyderabad’s premier tech-enabled sports arena. Our facility merges a high-performance 90ft x 60ft arena with a fully digital match-day experience. Experience the future of play with AI-driven booking, seamless QR entry, and professional live scoring.',
                    image: 'https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&q=80&w=1200',
                    tags: ['#TechTurfMiyapur', '#SmartArena', '#BoxCricketExpert', '#DigitalMatchDay']
                }
            };
        }

        // About Page Logic
        if (!config && req.params.pageName === 'about') {
            config = {
                pageName: 'about',
                hero: {
                    welcome: 'Welcome to the Future of Sports',
                    title: 'Play Smart. Book Instantly.',
                    subtitle: 'Compete Better.',
                    description: 'The Turf is an AI-powered sports arena ecosystem. We eliminate booking friction and elevate your match-day experience with real-time stats and automation.'
                },
                features: [
                    { title: "Instant Booking", desc: "Find open slots in real-time and secure them securely in seconds." },
                    { title: "AI CricBot", desc: "Our 24/7 intelligent agent helps you book, check stats, and resolve issues." },
                    { title: "Live Match Scoring", desc: "Pro-grade broadcast scoring interface tracking every ball and run." },
                    { title: "Leaderboards", desc: "Compete with local athletes. Your stats define your rank." },
                    { title: "QR Access", desc: "Contactless, cryptographically secure field entry on match day." },
                    { title: "Secure Payments", desc: "Frictionless embedded checkouts handling splits and refunds." }
                ],
                stats: [
                    { stat: "90%+", label: "Successful Matches" },
                    { stat: "<200ms", label: "Real-time Sync" },
                    { stat: "24/7", label: "AI Support" },
                    { stat: "100%", label: "Secure Venues" }
                ]
            };
        }
        
        res.json({ success: true, config });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// @route   POST /api/config/:pageName
// @desc    Update dynamic page configuration
// @access  Private (Admin)
router.post('/:pageName', verifyToken, async (req, res) => {
    try {
        const isAdmin = await Admin.findById(req.user.id);
        if (!isAdmin) return res.status(403).json({ success: false, message: "Admin access required" });

        const config = await PageConfig.findOneAndUpdate(
            { pageName: req.params.pageName },
            { $set: req.body },
            { new: true, upsert: true }
        );

        res.json({ success: true, config });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;

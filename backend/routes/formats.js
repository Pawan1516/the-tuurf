const express = require('express');
const router = express.Router();

/**
 * @route   GET /api/formats
 * @desc    Get all available cricket formats and their rules
 * @access  Public
 */
router.get('/', (req, res) => {
    const formats = [
        { id: 'T3', name: 'Blitz 3', overs: 3, time: '20 min', powerplay: 'None', max_bowler: 2, avg_score: '25–40' },
        { id: 'T5', name: 'S.Blitz 5', overs: 5, time: '30 min', powerplay: 'None', max_bowler: 2, avg_score: '40–65' },
        { id: 'T6', name: 'Box Cricket', overs: 6, time: '35 min', powerplay: 'Ov 1–2', max_bowler: 2, avg_score: '50–80' },
        { id: 'T7', name: 'Blitz 7', overs: 7, time: '40 min', powerplay: 'Ov 1–2', max_bowler: 2, avg_score: '60–95' },
        { id: 'T8', name: 'Power 8', overs: 8, time: '45 min', powerplay: 'Ov 1–3', max_bowler: 3, avg_score: '70–110' },
        { id: 'T9', name: 'Rush 9', overs: 9, time: '50 min', powerplay: 'Ov 1–3', max_bowler: 3, avg_score: '80–120' },
        { id: 'T10', name: 'T10', overs: 10, time: '55 min', powerplay: 'Ov 1–3', max_bowler: 3, avg_score: '90–135' },
        { id: 'T11', name: 'Street 11', overs: 11, time: '60 min', powerplay: 'Ov 1–3', max_bowler: 3, avg_score: '95–145' },
        { id: 'T12', name: 'Club 12', overs: 12, time: '65 min', powerplay: 'Ov 1–4', max_bowler: 4, avg_score: '100–155' },
        { id: 'T13', name: 'Prem 13', overs: 13, time: '70 min', powerplay: 'Ov 1–4', max_bowler: 4, avg_score: '110–165' },
        { id: 'T14', name: 'Elite 14', overs: 14, time: '75 min', powerplay: 'Ov 1–4', max_bowler: 4, avg_score: '115–170' },
        { id: 'T15', name: 'T15', overs: 15, time: '80 min', powerplay: 'Ov 1–5', max_bowler: 5, avg_score: '120–180' },
        { id: 'T20', name: 'T20', overs: 20, time: '180 min', powerplay: 'Ov 1–6', max_bowler: 4, avg_score: '150–190' }
    ];
    res.json({ success: true, formats });
});

/**
 * @route   GET /api/formats/:overs
 * @desc    Get rules for a specific over count
 */
router.get('/:overs', (req, res) => {
    const overs = parseInt(req.params.overs);
    // Dynamic rule generator for Box Cricket / Indoor logic
    const rules = {
        overs,
        powerplay: overs <= 5 ? 'None' : overs <= 8 ? 'Ov 1-2' : overs <= 12 ? 'Ov 1-3' : 'Ov 1-4',
        max_bowler_limit: Math.ceil(overs / 4),
        is_high_scoring: overs >= 10
    };
    res.json({ success: true, rules });
});

module.exports = router;

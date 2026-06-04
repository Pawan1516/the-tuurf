import express, { Router } from 'express';
import { matchController } from '../controllers/MatchController';
import { authMiddleware } from '../middleware/auth';

const router: Router = express.Router();

// Match routes
router.post('/', authMiddleware, (req, res) => matchController.createMatch(req, res));
router.get('/:matchId', authMiddleware, async (req, res) => {
  try {
    const match = await require('../models/Match').default.findById(req.params.matchId);
    res.json({ success: true, data: match });
  } catch (error) {
    res.status(500).json({ success: false, error });
  }
});
router.post('/:matchId/invite-players', authMiddleware, (req, res) => matchController.invitePlayer(req, res));
router.put('/:matchId/accept-invite', authMiddleware, (req, res) => matchController.acceptInvitation(req, res));
router.post('/:matchId/playing-xi', authMiddleware, (req, res) => matchController.setPlayingXI(req, res));
router.post('/:matchId/toss', authMiddleware, (req, res) => matchController.conductToss(req, res));
router.post('/:matchId/ball/score', authMiddleware, (req, res) => matchController.scoreBall(req, res));
router.get('/:matchId/live-score', (req, res) => matchController.getLiveScore(req, res));

export default router;

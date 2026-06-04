import { Request, Response } from 'express';
import { matchService } from '../services/MatchService';

export class MatchController {
  async createMatch(req: Request, res: Response) {
    try {
      const { matchName, matchType, format, turfSlot, rules } = req.body;
      const userId = (req as any).userId;

      const result = await matchService.createMatch({
        matchName,
        matchType,
        format,
        turfSlotId: turfSlot,
        createdBy: userId,
        matchDate: new Date(req.body.matchDate),
        rules,
        score: {
          team1: { runs: 0, wickets: 0, overs: 0 },
          team2: { runs: 0, wickets: 0, overs: 0 }
        }
      });

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: error instanceof Error ? error.message : 'Failed to create match' }
      });
    }
  }

  async invitePlayer(req: Request, res: Response) {
    try {
      const { matchId } = req.params;
      const { phone, team, name } = req.body;

      const result = await matchService.invitePlayerByPhone(matchId, phone, team, name);

      res.json({
        success: true,
        message: result.message,
        data: result.data
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: error instanceof Error ? error.message : 'Failed to invite player' }
      });
    }
  }

  async acceptInvitation(req: Request, res: Response) {
    try {
      const { matchId } = req.params;
      const userId = (req as any).userId;

      const result = await matchService.acceptInvitation(matchId, userId);

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: error instanceof Error ? error.message : 'Failed to accept invitation' }
      });
    }
  }

  async setPlayingXI(req: Request, res: Response) {
    try {
      const { matchId } = req.params;
      const { team, players } = req.body;

      const result = await matchService.setPlayingXI(matchId, team, players);

      res.json({
        success: true,
        message: result.message,
        data: result.data
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: error instanceof Error ? error.message : 'Failed to set playing XI' }
      });
    }
  }

  async conductToss(req: Request, res: Response) {
    try {
      const { matchId } = req.params;
      const { winner, decision } = req.body;

      const result = await matchService.conductToss(matchId, winner, decision);

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: error instanceof Error ? error.message : 'Failed to conduct toss' }
      });
    }
  }

  async scoreBall(req: Request, res: Response) {
    try {
      const { matchId } = req.params;
      const ballData = req.body;

      const result = await matchService.scoreBall(matchId, ballData);

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: error instanceof Error ? error.message : 'Failed to score ball' }
      });
    }
  }

  async getLiveScore(req: Request, res: Response) {
    try {
      const { matchId } = req.params;

      const result = await matchService.getLiveScore(matchId);

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: error instanceof Error ? error.message : 'Failed to fetch live score' }
      });
    }
  }
}

export const matchController = new MatchController();

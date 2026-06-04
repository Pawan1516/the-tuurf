import User from '../models/User';
import Booking from '../models/Booking';
import Match from '../models/Match';

export class MatchService {
  // Create match
  async createMatch(matchData: any) {
    try {
      const match = new Match({
        ...matchData,
        matchId: `MATCH_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });

      await match.save();
      return {
        success: true,
        data: match
      };
    } catch (error) {
      console.error('Error creating match:', error);
      throw error;
    }
  }

  // Invite player by phone
  async invitePlayerByPhone(matchId: string, phone: string, team: string, name: string) {
    try {
      const match = await Match.findById(matchId);
      if (!match) {
        throw new Error('Match not found');
      }

      // Check if user exists with this phone
      const user = await User.findOne({ phone });

      match.players.push({
        userId: user?._id,
        phone,
        name,
        team,
        role: 'player',
        invitationStatus: 'pending'
      });

      await match.save();

      // TODO: Send SMS/WhatsApp invitation

      return {
        success: true,
        message: `Invitation sent to ${phone}`,
        data: match
      };
    } catch (error) {
      console.error('Error inviting player:', error);
      throw error;
    }
  }

  // Accept match invitation
  async acceptInvitation(matchId: string, userId: string) {
    try {
      const match = await Match.findByIdAndUpdate(
        matchId,
        {
          $set: {
            'players.$[elem].invitationStatus': 'accepted',
            'players.$[elem].acceptedAt': new Date()
          }
        },
        {
          arrayFilters: [{ 'elem.userId': userId }],
          new: true
        }
      );

      return {
        success: true,
        data: match
      };
    } catch (error) {
      console.error('Error accepting invitation:', error);
      throw error;
    }
  }

  // Set playing XI
  async setPlayingXI(matchId: string, team: string, players: any[]) {
    try {
      const match = await Match.findById(matchId);
      if (!match) {
        throw new Error('Match not found');
      }

      // Validate exactly 11 players
      if (players.length !== 11) {
        throw new Error('Playing XI must have exactly 11 players');
      }

      // Update team playing XI
      const teamIndex = match.teams.findIndex(t => t.teamName === team);
      if (teamIndex !== -1) {
        match.teams[teamIndex].players = players.map(p => p.userId);
      }

      await match.save();

      return {
        success: true,
        message: `Playing XI set for ${team}`,
        data: match
      };
    } catch (error) {
      console.error('Error setting playing XI:', error);
      throw error;
    }
  }

  // Conduct toss
  async conductToss(matchId: string, winnerTeam: string, decision: 'bat' | 'bowl') {
    try {
      const match = await Match.findByIdAndUpdate(
        matchId,
        {
          $set: {
            toss: {
              winner: winnerTeam,
              decision,
              timestamp: new Date()
            },
            status: 'ready'
          }
        },
        { new: true }
      );

      return {
        success: true,
        data: match
      };
    } catch (error) {
      console.error('Error conducting toss:', error);
      throw error;
    }
  }

  // Score ball
  async scoreBall(matchId: string, ballData: any) {
    try {
      const match = await Match.findById(matchId);
      if (!match) {
        throw new Error('Match not found');
      }

      // Update score
      const { runs, wicket, team } = ballData;
      
      if (team === 'team1') {
        match.score.team1.runs += runs;
        if (wicket) match.score.team1.wickets += 1;
      } else {
        match.score.team2.runs += runs;
        if (wicket) match.score.team2.wickets += 1;
      }

      await match.save();

      return {
        success: true,
        data: match.score
      };
    } catch (error) {
      console.error('Error scoring ball:', error);
      throw error;
    }
  }

  // Get live score
  async getLiveScore(matchId: string) {
    try {
      const match = await Match.findById(matchId);
      if (!match) {
        throw new Error('Match not found');
      }

      return {
        success: true,
        data: {
          matchId: match._id,
          score: match.score,
          status: match.status,
          teams: match.teams
        }
      };
    } catch (error) {
      console.error('Error getting live score:', error);
      throw error;
    }
  }
}

export const matchService = new MatchService();

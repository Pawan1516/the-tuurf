// Minimal service layer (placeholders)
class MatchesService {
  async verifyQR(matchId, token) {
    // implement verification logic
    return { matchId, verified: true };
  }

  async startMatch(matchId, payload) {
    // change state, set openers
    return { matchId, status: 'LIVE', payload };
  }

  async recordBall(matchId, ball) {
    // persist ball
    const repo = require('../repositories/matchesRepo');
    const insertedId = await repo.saveBall(matchId, ball);
    return { matchId, ballId: insertedId };
  }
}

module.exports = new MatchesService();

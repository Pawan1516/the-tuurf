const db = require('../db');

class MatchesRepo {
  async findById(id) {
    const dbo = await db.getDb();
    return dbo.collection('matches').findOne({ _id: id });
  }

  async saveBall(matchId, ball) {
    const dbo = await db.getDb();
    const balls = dbo.collection('balls');
    const res = await balls.insertOne({ matchId, ...ball, createdAt: new Date() });

    // Minimal aggregation update: increment runs/wickets on innings document if exists
    try {
      if (typeof ball.runs === 'number') {
        await dbo.collection('innings').updateOne(
          { matchId: matchId, inningNumber: ball.inning },
          { $inc: { 'score.runs': ball.runs } },
          { upsert: true }
        );
      }
      if (ball.wicket) {
        await dbo.collection('innings').updateOne(
          { matchId: matchId, inningNumber: ball.inning },
          { $inc: { 'score.wickets': 1 } },
          { upsert: true }
        );
      }
    } catch (err) {
      console.warn('Post-ball aggregation update failed', err.message);
    }

    return res.insertedId;
  }
}

module.exports = new MatchesRepo();

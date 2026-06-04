const AIInsight = require('../models/AIInsight');

async function saveInsight({ matchId, innings = 1, over = 0, ball = 0, type = 'commentary', title = '', content = '', confidence = null, meta = {} }) {
  if (!matchId || !content) throw new Error('matchId and content required');

  const doc = new AIInsight({
    match_id: matchId,
    innings,
    over,
    ball,
    type,
    title,
    content,
    confidence,
    meta
  });

  return doc.save();
}

module.exports = { saveInsight };

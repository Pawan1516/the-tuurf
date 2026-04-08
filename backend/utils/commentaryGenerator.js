/**
 * Generates human-like cricket commentary based on ball data.
 */
exports.generateCommentary = (ball, score, wickets, batsmanName) => {
    const { over, ball: bNum, runs, is_wicket, extra } = ball;
    const overStr = `${over}.${bNum}`;
    
    if (is_wicket) {
        const wicketMsgs = [
            `OUT! Big blow for the batting side! ${batsmanName} has to walk back.`,
            `GONE! That's a massive wicket! ${batsmanName} is frustrated.`,
            `WICKET! Excellent delivery and the fielding side is celebrate!`,
            `TRAPPED! ${batsmanName} is out. Huge breakthrough.`
        ];
        return `${overStr} — ${wicketMsgs[Math.floor(Math.random() * wicketMsgs.length)]} ${score}/${wickets}`;
    }

    if (extra === 'wd') {
        return `${overStr} — Wide ball. One run added to the total. ${score}/${wickets}`;
    }
    if (extra === 'nb') {
        return `${overStr} — No Ball! Free hit coming up. One run to the total. ${score}/${wickets}`;
    }

    if (runs === 6) {
        return `${overStr} — SIX! ${batsmanName} sends this one deep into the stands! High and handsome! ${score}/${wickets}`;
    }
    if (runs === 4) {
        return `${overStr} — FOUR! Cracking shot from ${batsmanName}, finds the gap perfectly. ${score}/${wickets}`;
    }
    
    if (runs === 0) {
        return `${overStr} — No run. Solid defense from ${batsmanName}. ${score}/${wickets}`;
    }

    const runMsgs = [
        `${runs} run${runs > 1 ? 's' : ''}. Good rotation of strike.`,
        `Played away for ${runs}.`,
        `${batsmanName} nudges it for ${runs}.`,
        `Comfortable ${runs} run${runs > 1 ? 's' : ''} for the batting duo.`
    ];
    return `${overStr} — ${runMsgs[Math.floor(Math.random() * runMsgs.length)]} ${score}/${wickets}`;
};

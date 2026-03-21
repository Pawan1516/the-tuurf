/**
 * Auto-generate cricket commentary for each ball
 */
const COMMENTARY = {
    0: [
        "Dot ball! Good defensive play",
        "No run. Tight bowling",
        "Played to the fielder, no run",
        "Blocked solidly, dot ball",
        "Good length delivery, defended well"
    ],
    1: [
        "Quick single taken",
        "Pushed to the off side for a single",
        "Nudged for one. Good running",
        "Tapped and they scurry through for one",
        "Rotates the strike with a gentle push"
    ],
    2: [
        "Well placed! Two runs",
        "Good running between the wickets. Two taken",
        "Flicked off the pads for a couple",
        "Driven through the gap for two"
    ],
    3: [
        "Three runs! Excellent placement",
        "They come back for three. Great running",
        "Played deep, they get three"
    ],
    4: [
        "FOUR! Beautiful boundary 🏏",
        "FOUR! Cracking cover drive!",
        "FOUR! Smashed through the gap!",
        "FOUR! Racing away to the fence!",
        "FOUR! Timed to perfection!",
        "FOUR! That's a gorgeous shot!"
    ],
    6: [
        "SIX! Into the stands! 🎆",
        "SIX! Massive hit!",
        "SIX! What a shot! Clean hitting!",
        "SIX! Out of the ground! Maximum!",
        "SIX! That's into orbit! Incredible power!"
    ],
    wide: [
        "Wide ball! Extra run conceded",
        "Too wide outside off, wide called",
        "Down the leg side, wide signaled"
    ],
    noball: [
        "No ball! Overstepping from the bowler",
        "No ball! Free hit coming up",
        "Front foot no ball! Extra run"
    ],
    bye: [
        "Bye! Went past the keeper",
        "Bye taken. Through to the keeper"
    ],
    wicket: {
        bowled: [
            "BOWLED! Timber! The stumps are shattered! 🎯",
            "BOWLED! Clean bowled! What a delivery!",
            "BOWLED HIM! Through the gate!"
        ],
        caught: [
            "CAUGHT! Taken cleanly! Big wicket! 🤲",
            "CAUGHT! Straight to the fielder!",
            "CAUGHT! Edged and taken behind!"
        ],
        lbw: [
            "LBW! Plumb in front! 🦵",
            "LBW! Dead straight, hitting leg stump!",
            "LBW! Trapped in front of the wickets!"
        ],
        runout: [
            "RUN OUT! Direct hit! Brilliant fielding! 🏃",
            "RUN OUT! That's outstanding athleticism!",
            "RUN OUT! Short of the crease!"
        ],
        stumped: [
            "STUMPED! Quick hands from the keeper! 🧤",
            "STUMPED! Beaten in flight and stumped!",
            "STUMPED! Gone in a flash!"
        ],
        hitwicket: [
            "HIT WICKET! Dislodged the bails! 💥",
            "HIT WICKET! Stepped on the stumps!"
        ]
    }
};

function generateCommentary(ballData) {
    const { runs, isWicket, wicketType, extraType, batsmanName, bowlerName, overNum, ballNum } = ballData;

    const prefix = `${overNum}.${ballNum}`;

    if (isWicket && wicketType) {
        const lines = COMMENTARY.wicket[wicketType] || COMMENTARY.wicket.bowled;
        const line = lines[Math.floor(Math.random() * lines.length)];
        return `${prefix} — ${bowlerName} to ${batsmanName}, ${line}`;
    }

    if (extraType === 'wide' || extraType === 'wd') {
        const lines = COMMENTARY.wide;
        return `${prefix} — ${bowlerName}, ${lines[Math.floor(Math.random() * lines.length)]}`;
    }

    if (extraType === 'noball' || extraType === 'nb') {
        const lines = COMMENTARY.noball;
        return `${prefix} — ${bowlerName}, ${lines[Math.floor(Math.random() * lines.length)]}`;
    }

    if (extraType === 'bye') {
        const lines = COMMENTARY.bye;
        return `${prefix} — ${bowlerName} to ${batsmanName}, ${lines[Math.floor(Math.random() * lines.length)]}`;
    }

    const runLines = COMMENTARY[runs] || COMMENTARY[1];
    const line = runLines[Math.floor(Math.random() * runLines.length)];
    return `${prefix} — ${bowlerName} to ${batsmanName}, ${line}`;
}

module.exports = { generateCommentary };

const mongoose = require('mongoose');

const VenueSchema = new mongoose.Schema({
    name: { type: String },
    address: { type: String },
    city: { type: String },
    groundCount: { type: Number, default: 1 }
}, { _id: false });

const SponsorSchema = new mongoose.Schema({
    name: { type: String },
    logo: { type: String },
    website: { type: String },
    tier: { type: String, enum: ['title', 'gold', 'silver', 'associate'], default: 'associate' }
}, { _id: false });

const RegisteredTeamSchema = new mongoose.Schema({
    team_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    registeredAt: { type: Date, default: Date.now },
    approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'refunded'], default: 'pending' },
    paymentId: { type: String },
    razorpayOrderId: { type: String },
    razorpaySignature: { type: String },
    points: { type: Number, default: 0 },
    played: { type: Number, default: 0 },
    won: { type: Number, default: 0 },
    lost: { type: Number, default: 0 },
    tied: { type: Number, default: 0 },
    noResult: { type: Number, default: 0 },
    nrr: { type: Number, default: 0 },
    runsFor: { type: Number, default: 0 },
    oversFor: { type: Number, default: 0 },
    runsAgainst: { type: Number, default: 0 },
    oversAgainst: { type: Number, default: 0 }
});

const KnockoutRoundSchema = new mongoose.Schema({
    round: { type: String }, // 'QF', 'SF', 'F', 'R16'
    matches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Match' }]
}, { _id: false });

const AwardsSchema = new mongoose.Schema({
    orangeCap: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    purpleCap: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    mvp: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    bestBatsman: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    bestBowler: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    bestWicketKeeper: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    bestCaptain: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emergingPlayer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    manOfTheTournament: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    winnerTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    runnerUpTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' }
}, { _id: false });

const TournamentSchema = new mongoose.Schema({
    // Basic Info
    name: { type: String, required: true },
    slug: { type: String },
    description: { type: String },
    logo: { type: String },
    banner: { type: String },

    // Organizer
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    organizerName: { type: String },
    
    // Format
    tournamentType: { type: String, enum: ['league', 'knockout', 'league_knockout', 'group_playoff', 'double_elimination'], default: 'league' },
    ballType: { type: String, enum: ['leather', 'tennis', 'hard_tennis', 'rubber', 'tape_ball', 'other'], default: 'leather' },
    tieBreakerMethod: { type: String, enum: ['super_over', 'bowl_out', 'boundary_count'], default: 'super_over' },
    matchFormat: { type: String, enum: ['T10', 'T20', 'T30', 'ODI', 'custom'], default: 'T20' },
    oversPerMatch: { type: Number, default: 20 },
    totalTeams: { type: Number, default: 8 },
    minTeamSize: { type: Number, default: 7 },  // min players per team (7-11)
    maxTeamSize: { type: Number, default: 11 }, // max players per team (7-11)
    reserveDays: { type: Number, default: 0 },  // extra days reserved for rain delays

    // League stage settings (for league_knockout)
    leagueTopTeams: { type: Number, default: 4 }, // teams qualifying from league

    // Registration
    registrationStartDate: { type: Date },
    registrationEndDate: { type: Date },
    startDate: { type: Date },
    endDate: { type: Date },
    
    // Finance
    entryFee: { type: Number, default: 0 },
    prizePool: { type: Number, default: 0 },
    prizeDistribution: {
        first: { type: Number, default: 0 },
        second: { type: Number, default: 0 },
        third: { type: Number, default: 0 }
    },

    // Venues
    venues: [VenueSchema],

    // Status
    status: { type: String, enum: ['draft', 'registration', 'ongoing', 'knockout', 'completed', 'cancelled'], default: 'draft' },

    // Teams
    registeredTeams: [RegisteredTeamSchema],
    
    // Matches
    leagueMatches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Match' }],
    knockoutRounds: [KnockoutRoundSchema],

    // Officials
    scorers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    umpires: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Sponsors
    sponsors: [SponsorSchema],

    // Gallery
    gallery: [{ url: String, caption: String, uploadedAt: Date }],

    // Awards
    awards: AwardsSchema,

    // Rules
    rules: {
        minPlayersPerTeam: { type: Number, default: 7 },
        maxPlayersPerTeam: { type: Number, default: 11 },
        playingXISize: { type: Number, default: 11 },
        substitutes: { type: Number, default: 4 },
        powerplayOvers: { type: Number, default: 6 },
        maxOversBowler: { type: Number, default: 4 },
        dls: { type: Boolean, default: false },
        superOver: { type: Boolean, default: true },  // enable super over for ties
        bonusPoints: { type: Boolean, default: false } // ALWAYS false — no bonus points
    },

    // Control
    pausedAt: { type: Date },
    pauseReason: { type: String },
    archivedAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },

    // Metadata
    visibility: { type: String, enum: ['public', 'private'], default: 'public' },
    featured: { type: Boolean, default: false }
}, { timestamps: true });

// Auto-generate slug before save
TournamentSchema.pre('save', function(next) {
    if (!this.slug) {
        this.slug = this.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();
    }
    next();
});

module.exports = mongoose.model('Tournament', TournamentSchema);

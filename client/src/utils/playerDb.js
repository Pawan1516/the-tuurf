import apiClient from '../api/client';

const PLAYER_DB_KEY = 'THE_TURF_PLAYER_DB';

export const PlayerDB = {
    getAll: () => {
        const data = localStorage.getItem(PLAYER_DB_KEY);
        return data ? JSON.parse(data) : {};
    },
    save: (data) => {
        localStorage.setItem(PLAYER_DB_KEY, JSON.stringify(data));
    },
    get: (name) => {
        const db = PlayerDB.getAll();
        return db[name] || {
            name: name,
            matches: 0, runs: 0, balls: 0, wickets: 0, overs: 0, runsConceded: 0,
            fifties: 0, hundreds: 0, highScore: 0, bestBowling: { w: 0, r: 0 },
            role: 'Player', batStyle: 'Right-hand Bat', bowlStyle: 'Right-arm Fast', notes: ''
        };
    },
    getRemoteProfile: async (name) => {
        try {
            const res = await apiClient.get(`/players/profile/${name}`);
            if (res.data.success) {
                const sp = res.data.profile;
                return {
                    name: sp.name,
                    matches: sp.stats.batting.matches,
                    runs: sp.stats.batting.runs,
                    balls: sp.stats.batting.balls_faced,
                    wickets: sp.stats.bowling.wickets,
                    overs: sp.stats.bowling.overs,
                    highScore: sp.stats.batting.high_score,
                    bestBowling: { 
                        w: sp.stats.bowling.best_bowling?.wickets || 0,
                        r: sp.stats.bowling.best_bowling?.runs || 0
                    },
                    role: sp.cricket_profile.primary_role,
                    batStyle: sp.cricket_profile.batting_style,
                    bowlStyle: sp.cricket_profile.bowling_style,
                    notes: sp.is_guest ? "Guest Player" : "Verified Profile"
                };
            }
        } catch (e) { console.error("Player registry offline"); }
        return PlayerDB.get(name);
    },
    bulkUpdateRemote: async (results) => {
        try {
            await apiClient.post('/players/stats/bulk-update', { match_results: results });
            return { success: true };
        } catch (e) {
            console.error("Player DB Error:", e.response?.data || e.message);
            return { success: false, message: e.response?.data?.message || e.message };
        }
    },
    updatePlayer: (name, stats) => {
        // Keeping local for offline/temp cache
        const db = PlayerDB.getAll();
        const p = PlayerDB.get(name);
        const newStats = {
            ...p,
            matches: p.matches + 1,
            runs: p.runs + (stats.r || 0),
            balls: p.balls + (stats.b || 0),
            wickets: p.wickets + (stats.w || 0),
            overs: p.overs + (stats.o || 0),
            runsConceded: p.runsConceded + (stats.rc || 0),
            fifties: p.fifties + (stats.r >= 50 && stats.r < 100 ? 1 : 0),
            hundreds: p.hundreds + (stats.r >= 100 ? 1 : 0),
            highScore: Math.max(p.highScore, stats.r || 0),
        };
        if (stats.w > p.bestBowling.w || (stats.w === p.bestBowling.w && stats.rc < p.bestBowling.r)) {
            newStats.bestBowling = { w: stats.w, r: stats.rc };
        }
        db[name] = newStats;
        PlayerDB.save(db);
    },
    editProfile: (name, profile) => {
        const db = PlayerDB.getAll();
        const p = PlayerDB.get(name);
        db[name] = { ...p, ...profile };
        PlayerDB.save(db);
    },
    initializePresets: (presets) => {
        const db = PlayerDB.getAll();
        presets.forEach(team => {
            team.players.forEach(pName => {
                if (!db[pName]) {
                    db[pName] = {
                        name: pName,
                        matches: 0, runs: 0, balls: 0, wickets: 0, overs: 0, runsConceded: 0,
                        fifties: 0, hundreds: 0, highScore: 0, bestBowling: { w:0, r:0 },
                        role: 'Player', batStyle: 'Right-hand Bat', bowlStyle: 'Right-arm Fast', notes: 'Initial Seed'
                    };
                }
            });
        });
        PlayerDB.save(db);
    }
};


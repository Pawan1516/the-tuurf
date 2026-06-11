import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Trophy, Users, Calendar, MapPin, ChevronRight, Award, Star, Zap,
  BarChart3, Shield, Target, Clock, DollarSign, TrendingUp, TrendingDown,
  Globe, ExternalLink, Share2, Settings, PlayCircle, CheckCircle2,
  ArrowUp, ArrowDown, Minus, Activity, User, ChevronDown
} from 'lucide-react';
import apiClient from '../../api/client';
import { toast } from 'react-toastify';

const TABS = [
  { id: 'overview', label: 'Overview', icon: Globe },
  { id: 'fixtures', label: 'Fixtures', icon: Calendar },
  { id: 'points', label: 'Points Table', icon: BarChart3 },
  { id: 'teams', label: 'Teams', icon: Users },
  { id: 'players', label: 'Players', icon: User },
  { id: 'leaderboards', label: 'Leaderboards', icon: Trophy },
  { id: 'stats', label: 'Statistics', icon: TrendingUp },
  { id: 'sponsors', label: 'Sponsors', icon: Star },
  { id: 'gallery', label: 'Gallery', icon: Activity },
];

const StatusBadge = ({ status }) => {
  const map = {
    draft: 'bg-slate-100 text-slate-600',
    registration: 'bg-blue-100 text-blue-700',
    ongoing: 'bg-emerald-100 text-emerald-700',
    knockout: 'bg-orange-100 text-orange-700',
    completed: 'bg-slate-100 text-slate-500',
    cancelled: 'bg-red-100 text-red-500',
  };
  const labels = {
    draft: 'Draft', registration: '📋 Registration Open', ongoing: '🔴 Live',
    knockout: '⚔️ Knockout Stage', completed: '✅ Completed', cancelled: '❌ Cancelled'
  };
  return (
    <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${map[status] || map.draft}`}>
      {labels[status] || status}
    </span>
  );
};

// ── OVERVIEW TAB ─────────────────────────────────────────────────────
const OverviewTab = ({ tournament }) => (
  <div className="space-y-8">
    {/* Info grid */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[
        { icon: Target, label: 'Type', value: tournament.tournamentType?.replace('_', ' + ').toUpperCase() },
        { icon: Shield, label: 'Format', value: `${tournament.matchFormat || 'T20'} (${tournament.oversPerMatch || 20} overs)` },
        { icon: Activity, label: 'Ball Type', value: tournament.ballType || 'Leather' },
        { icon: Users, label: 'Teams', value: `${tournament.registeredTeams?.filter(t => t.approvalStatus === 'approved').length || 0} / ${tournament.totalTeams || '?'}` },
      ].map(({ icon: Icon, label, value }) => (
        <div key={label} className="bg-black/3 rounded-2xl p-4">
          <Icon size={16} className="text-emerald-500 mb-2" />
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
          <p className="text-sm font-black text-black mt-1">{value}</p>
        </div>
      ))}
    </div>

    {/* Description */}
    {tournament.description && (
      <div className="bg-white border border-black/8 rounded-2xl p-6">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">About</h3>
        <p className="text-sm text-slate-700 font-medium leading-relaxed">{tournament.description}</p>
      </div>
    )}

    {/* Dates */}
    <div className="grid grid-cols-2 gap-4">
      {tournament.registrationStartDate && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">Registration</p>
          <p className="text-xs font-bold text-blue-800">
            {new Date(tournament.registrationStartDate).toLocaleDateString('en-IN')} —{' '}
            {tournament.registrationEndDate ? new Date(tournament.registrationEndDate).toLocaleDateString('en-IN') : 'Ongoing'}
          </p>
        </div>
      )}
      {tournament.startDate && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Tournament Dates</p>
          <p className="text-xs font-bold text-emerald-800">
            {new Date(tournament.startDate).toLocaleDateString('en-IN')} —{' '}
            {tournament.endDate ? new Date(tournament.endDate).toLocaleDateString('en-IN') : 'TBD'}
          </p>
        </div>
      )}
    </div>

    {/* Venues */}
    {tournament.venues?.length > 0 && (
      <div>
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Venues</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tournament.venues.map((v, i) => (
            <div key={i} className="bg-white border border-black/8 rounded-2xl p-4 flex items-start gap-3">
              <MapPin size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-black text-black">{v.name}</p>
                <p className="text-[10px] text-slate-400 font-bold">{v.city}{v.address ? ` · ${v.address}` : ''}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Prize Pool */}
    {tournament.prizePool > 0 && (
      <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-6">
        <h3 className="text-xs font-black text-yellow-700 uppercase tracking-widest mb-4">Prize Pool</h3>
        <p className="text-3xl font-black text-yellow-800 mb-4">₹{tournament.prizePool.toLocaleString()}</p>
        {tournament.prizeDistribution && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { place: '🥇 1st', key: 'first' },
              { place: '🥈 2nd', key: 'second' },
              { place: '🥉 3rd', key: 'third' },
            ].map(({ place, key }) => tournament.prizeDistribution[key] > 0 && (
              <div key={key} className="bg-white/60 rounded-xl p-3 text-center">
                <p className="text-xs font-black text-yellow-700">{place}</p>
                <p className="text-sm font-black text-yellow-900 mt-1">₹{tournament.prizeDistribution[key].toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    )}

    {/* Organizer */}
    {tournament.organizer && (
      <div className="bg-white border border-black/8 rounded-2xl p-4 flex items-center gap-4">
        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
          <Shield size={18} className="text-emerald-600" />
        </div>
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Organized By</p>
          <p className="text-sm font-black text-black">{tournament.organizer.name}</p>
        </div>
      </div>
    )}
  </div>
);

// ── FIXTURES TAB ─────────────────────────────────────────────────────
const FixturesTab = ({ tournamentId }) => {
  const [fixtures, setFixtures] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get(`/tournaments/${tournamentId}/fixtures`)
      .then(r => setFixtures(r.data))
      .catch(() => toast.error('Failed to load fixtures'))
      .finally(() => setLoading(false));
  }, [tournamentId]);

  if (loading) return <div className="text-center py-12"><div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto" /></div>;

  const MatchCard = ({ match }) => {
    const statusColor = { Pending: 'bg-slate-100 text-slate-500', Live: 'bg-red-100 text-red-700', Completed: 'bg-emerald-100 text-emerald-700' };
    const a = match.team_a?.team_id;
    const b = match.team_b?.team_id;
    return (
      <Link to={`/live/${match._id}`} className="block bg-white border border-black/8 rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all group">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
            {match.matchNumber ? `Match ${match.matchNumber}` : match.knockoutRound || ''}
          </span>
          <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${statusColor[match.status] || statusColor.Pending}`}>
            {match.status}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {a?.logo ? <img src={a.logo} alt={a.name} className="w-9 h-9 rounded-xl object-cover" /> :
              <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 font-black text-xs">{a?.shortName?.[0] || a?.name?.[0] || '?'}</div>}
            <p className="font-black text-sm text-black">{a?.shortName || a?.name || 'TBD'}</p>
          </div>
          <div className="text-center">
            {match.status === 'Completed' ? (
              <div className="text-xs font-black text-slate-400">RESULT</div>
            ) : (
              <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center text-[10px] font-black text-slate-500">VS</div>
            )}
          </div>
          <div className="flex items-center gap-3 flex-row-reverse">
            {b?.logo ? <img src={b.logo} alt={b.name} className="w-9 h-9 rounded-xl object-cover" /> :
              <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-black text-xs">{b?.shortName?.[0] || b?.name?.[0] || '?'}</div>}
            <p className="font-black text-sm text-black">{b?.shortName || b?.name || 'TBD'}</p>
          </div>
        </div>
        {match.scheduledAt && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-black/5">
            <Calendar size={11} className="text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400">{new Date(match.scheduledAt).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
            {match.venue && <><span className="text-slate-200">·</span><MapPin size={11} className="text-slate-400" /><span className="text-[10px] font-bold text-slate-400">{match.venue}</span></>}
          </div>
        )}
      </Link>
    );
  };

  const totalMatches = (fixtures?.leagueMatches?.length || 0) + (fixtures?.knockoutRounds?.flatMap(r => r.matches)?.length || 0);
  
  return (
    <div className="space-y-8">
      {totalMatches === 0 ? (
        <div className="text-center py-16">
          <Calendar size={40} className="text-slate-300 mx-auto mb-4" />
          <p className="font-black text-slate-400 uppercase tracking-wide">Fixtures not yet generated</p>
        </div>
      ) : (
        <>
          {fixtures?.leagueMatches?.length > 0 && (
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">League Stage</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fixtures.leagueMatches.map(m => <MatchCard key={m._id} match={m} />)}
              </div>
            </div>
          )}
          {fixtures?.knockoutRounds?.map(round => (
            <div key={round.round}>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                {round.round === 'F' ? '🏆 Final' : round.round === 'SF' ? '⚔️ Semi Finals' : round.round === 'QF' ? 'Quarter Finals' : round.round}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {round.matches.map(m => <MatchCard key={m._id} match={m} />)}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
};

// ── POINTS TABLE TAB ─────────────────────────────────────────────────
const PointsTab = ({ tournamentId }) => {
  const [table, setTable] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get(`/tournaments/${tournamentId}/points-table`)
      .then(r => setTable(r.data.table || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tournamentId]);

  if (loading) return <div className="text-center py-12"><div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto" /></div>;

  return (
    <div>
      {table.length === 0 ? (
        <div className="text-center py-16">
          <BarChart3 size={40} className="text-slate-300 mx-auto mb-4" />
          <p className="font-black text-slate-400 uppercase tracking-wide">No matches played yet</p>
        </div>
      ) : (
        <div className="bg-white border border-black/8 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-black/3">
                <tr>
                  {['Pos', 'Team', 'M', 'W', 'L', 'T', 'NR', 'Pts', 'NRR'].map(h => (
                    <th key={h} className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.map((row, i) => (
                  <tr key={i} className={`border-t border-black/5 hover:bg-black/2 transition-colors ${i < 4 ? 'border-l-2 border-l-emerald-500' : ''}`}>
                    <td className="px-4 py-4">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${
                        i === 0 ? 'bg-yellow-100 text-yellow-700' :
                        i === 1 ? 'bg-slate-200 text-slate-700' :
                        i === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-black/5 text-slate-500'
                      }`}>{row.position}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {row.team?.logo ? (
                          <img src={row.team.logo} alt={row.team.name} className="w-8 h-8 rounded-lg object-cover" />
                        ) : (
                          <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 font-black text-xs">
                            {row.team?.name?.[0] || '?'}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-black text-black">{row.team?.name || '—'}</p>
                          {row.team?.city && <p className="text-[9px] text-slate-400 font-bold">{row.team.city}</p>}
                        </div>
                      </div>
                    </td>
                    {[row.played, row.won, row.lost, row.tied, row.noResult].map((v, j) => (
                      <td key={j} className="px-4 py-4 text-sm font-bold text-slate-600 text-center">{v || 0}</td>
                    ))}
                    <td className="px-4 py-4 text-sm font-black text-emerald-700 text-center">{row.points || 0}</td>
                    <td className="px-4 py-4">
                      <span className={`text-xs font-black ${row.nrrRaw >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {row.nrr}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-black/5 flex items-center gap-2">
            <div className="w-3 h-3 border-l-2 border-emerald-500" />
            <span className="text-[9px] font-bold text-slate-400">Qualifying for knockout stage</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ── TEAMS TAB ─────────────────────────────────────────────────────────
const TeamsTab = ({ tournamentId }) => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get(`/tournaments/${tournamentId}/teams`)
      .then(r => setTeams(r.data.teams || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tournamentId]);

  if (loading) return <div className="text-center py-12"><div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {teams.length === 0 ? (
        <div className="col-span-3 text-center py-16">
          <Users size={40} className="text-slate-300 mx-auto mb-4" />
          <p className="font-black text-slate-400 uppercase tracking-wide">No teams yet</p>
        </div>
      ) : teams.map(team => (
        <Link to={`/teams/${team._id}`} key={team._id} className="bg-white border border-black/8 rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="flex items-center gap-3 mb-4">
            {team.logo ? (
              <img src={team.logo} alt={team.name} className="w-12 h-12 rounded-xl object-cover" />
            ) : (
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 font-black text-lg">
                {team.name?.[0] || '?'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-black text-black text-sm truncate">{team.name}</p>
              {team.city && <p className="text-[10px] text-slate-400 font-bold">{team.city}</p>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'Players', value: team.players?.length || 0 },
              { label: 'W', value: team.won || team.stats?.wins || 0 },
              { label: 'Pts', value: team.points || 0 },
            ].map(s => (
              <div key={s.label} className="bg-black/3 rounded-xl py-2">
                <p className="text-sm font-black text-black">{s.value}</p>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
              </div>
            ))}
          </div>
        </Link>
      ))}
    </div>
  );
};

// ── PLAYERS TAB ───────────────────────────────────────────────────────
const PlayersTab = ({ tournamentId }) => {
  const [players, setPlayers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get(`/tournaments/${tournamentId}/players`)
      .then(r => setPlayers(r.data.players || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tournamentId]);

  const filtered = players.filter(p => !search || p.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search players..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-xs bg-black/3 border border-black/10 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-emerald-500"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((p, i) => (
          <div key={i} className="bg-white border border-black/8 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 font-black text-sm">
              {p.name?.[0] || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-black truncate">{p.name}</p>
              <p className="text-[10px] text-slate-400 font-bold">{p.role} · {p.teamName}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── LEADERBOARDS TAB ──────────────────────────────────────────────────
const LeaderboardsTab = ({ tournamentId }) => {
  const [lbs, setLbs] = useState(null);
  const [active, setActive] = useState('orangeCap');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get(`/tournaments/${tournamentId}/leaderboards`)
      .then(r => setLbs(r.data.leaderboards))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tournamentId]);

  const LB_TABS = [
    { id: 'orangeCap', label: '🟠 Orange Cap', stat: 'runs', statLabel: 'Runs' },
    { id: 'purpleCap', label: '🟣 Purple Cap', stat: 'wickets', statLabel: 'Wickets' },
    { id: 'mvp', label: '⭐ MVP', stat: 'mvpScore', statLabel: 'Score' },
    { id: 'mostSixes', label: '💥 Most Sixes', stat: 'sixes', statLabel: 'Sixes' },
    { id: 'mostFours', label: '4️⃣ Most Fours', stat: 'fours', statLabel: 'Fours' },
    { id: 'bestStrikeRate', label: '⚡ Strike Rate', stat: 'strikeRate', statLabel: 'SR' },
    { id: 'bestEconomy', label: '📉 Economy', stat: 'economy', statLabel: 'Eco' },
    { id: 'mostCatches', label: '🧤 Catches', stat: 'catches', statLabel: 'Catches' },
  ];

  const currentLB = LB_TABS.find(t => t.id === active);
  const data = lbs?.[active] || [];

  if (loading) return <div className="text-center py-12"><div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto" /></div>;

  return (
    <div>
      <div className="flex gap-2 flex-wrap mb-6">
        {LB_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              active === t.id ? 'bg-black text-white' : 'bg-black/5 text-slate-500 hover:bg-black/8'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {data.length === 0 ? (
        <div className="text-center py-16">
          <Trophy size={40} className="text-slate-300 mx-auto mb-4" />
          <p className="font-black text-slate-400 uppercase tracking-wide">No data yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((p, i) => (
            <div key={i} className={`bg-white border border-black/8 rounded-2xl px-5 py-4 flex items-center gap-4 ${i === 0 ? 'border-yellow-300 bg-yellow-50/30' : ''}`}>
              <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black ${
                i === 0 ? 'bg-yellow-400 text-white' :
                i === 1 ? 'bg-slate-200 text-slate-700' :
                i === 2 ? 'bg-orange-300 text-white' :
                'bg-black/5 text-slate-500'
              }`}>{i + 1}</span>
              <div className="flex-1">
                <p className="text-sm font-black text-black">{p.name}</p>
                <p className="text-[10px] text-slate-400 font-bold">{p.team_id?.name || ''}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-emerald-700">{p[currentLB.stat] || 0}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{currentLB.statLabel}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── SPONSORS TAB ──────────────────────────────────────────────────────
const SponsorsTab = ({ tournament }) => (
  <div>
    {!tournament.sponsors?.length ? (
      <div className="text-center py-16">
        <Star size={40} className="text-slate-300 mx-auto mb-4" />
        <p className="font-black text-slate-400 uppercase tracking-wide">No sponsors yet</p>
      </div>
    ) : (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {tournament.sponsors.map((s, i) => (
          <a key={i} href={s.website || '#'} target="_blank" rel="noreferrer"
            className="bg-white border border-black/8 rounded-2xl p-6 flex flex-col items-center gap-3 hover:shadow-md transition-all group">
            {s.logo ? (
              <img src={s.logo} alt={s.name} className="h-14 object-contain" />
            ) : (
              <div className="w-14 h-14 bg-black/5 rounded-xl flex items-center justify-center">
                <Star size={24} className="text-slate-400" />
              </div>
            )}
            <p className="text-xs font-black text-black text-center">{s.name}</p>
            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
              s.tier === 'title' ? 'bg-yellow-100 text-yellow-700' :
              s.tier === 'gold' ? 'bg-yellow-50 text-yellow-600' :
              'bg-slate-100 text-slate-500'
            }`}>{s.tier}</span>
          </a>
        ))}
      </div>
    )}
  </div>
);

// ── GALLERY TAB ───────────────────────────────────────────────────────
const GalleryTab = ({ tournament }) => (
  <div>
    {!tournament.gallery?.length ? (
      <div className="text-center py-16">
        <Activity size={40} className="text-slate-300 mx-auto mb-4" />
        <p className="font-black text-slate-400 uppercase tracking-wide">Gallery is empty</p>
      </div>
    ) : (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {tournament.gallery.map((g, i) => (
          <div key={i} className="relative aspect-square rounded-2xl overflow-hidden bg-black/5 group">
            <img src={g.url} alt={g.caption || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            {g.caption && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-[10px] font-bold">{g.caption}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    )}
  </div>
);

// ── STATS TAB ─────────────────────────────────────────────────────────
const StatsTab = ({ tournamentId, tournament }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[
        { label: 'Total Matches', value: tournament.leagueMatches?.length + (tournament.knockoutRounds?.flatMap(r => r.matches)?.length || 0) || 0, icon: Activity },
        { label: 'Teams', value: tournament.registeredTeams?.filter(t => t.approvalStatus === 'approved').length || 0, icon: Users },
        { label: 'Prize Pool', value: tournament.prizePool > 0 ? `₹${(tournament.prizePool/1000).toFixed(0)}K` : 'None', icon: Award },
        { label: 'Format', value: tournament.matchFormat || 'T20', icon: Target },
      ].map(({ label, value, icon: Icon }) => (
        <div key={label} className="bg-white border border-black/8 rounded-2xl p-5 text-center">
          <Icon size={20} className="text-emerald-500 mx-auto mb-2" />
          <p className="text-2xl font-black text-black">{value}</p>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{label}</p>
        </div>
      ))}
    </div>
    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
      <p className="text-sm font-black text-emerald-800">Detailed match statistics will appear here after matches are played</p>
    </div>
  </div>
);

// ── MAIN COMPONENT ────────────────────────────────────────────────────
export default function TournamentHome() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    apiClient.get(`/tournaments/${id}`)
      .then(r => setTournament(r.data.tournament))
      .catch(() => toast.error('Failed to load tournament'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );

  if (!tournament) return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
      <div className="text-center">
        <Trophy size={48} className="text-slate-300 mx-auto mb-4" />
        <p className="font-black text-slate-400 uppercase tracking-wide">Tournament not found</p>
        <button onClick={() => navigate('/tournaments')} className="mt-4 bg-emerald-500 text-black font-black px-6 py-2 rounded-xl">
          Back to Tournaments
        </button>
      </div>
    </div>
  );

  const approvedTeams = tournament.registeredTeams?.filter(t => t.approvalStatus === 'approved').length || 0;

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Hero */}
      <div className="relative h-64 md:h-80 bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 overflow-hidden">
        {tournament.banner && (
          <img src={tournament.banner} alt="banner" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent" />

        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10 max-w-7xl mx-auto w-full">
          <div className="flex items-end gap-6">
            {tournament.logo ? (
              <img src={tournament.logo} alt="logo" className="w-20 h-20 rounded-2xl object-cover border-2 border-white/20 shadow-2xl flex-shrink-0" />
            ) : (
              <div className="w-20 h-20 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Trophy size={36} className="text-emerald-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <StatusBadge status={tournament.status} />
              </div>
              <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tight text-white truncate">
                {tournament.name}
              </h1>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-white/50 text-xs font-bold">{tournament.matchFormat}</span>
                <span className="text-white/30">·</span>
                <span className="text-white/50 text-xs font-bold">{approvedTeams}/{tournament.totalTeams} Teams</span>
                {tournament.venues?.[0] && (
                  <>
                    <span className="text-white/30">·</span>
                    <div className="flex items-center gap-1 text-white/50">
                      <MapPin size={11} />
                      <span className="text-xs font-bold">{tournament.venues[0].city || tournament.venues[0].name}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="hidden md:flex gap-2">
              <button
                onClick={() => navigate(`/tournaments/${id}/admin`)}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
              >
                <Settings size={14} />
                Manage
              </button>
              <button
                onClick={() => navigate(`/tournaments/${id}/register`)}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
              >
                <Users size={14} />
                Register Team
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-black/8 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-4 text-[10px] font-black uppercase tracking-widest whitespace-nowrap border-b-2 transition-all ${
                    activeTab === tab.id
                      ? 'border-emerald-500 text-emerald-600'
                      : 'border-transparent text-slate-400 hover:text-black'
                  }`}
                >
                  <Icon size={13} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile action buttons */}
      <div className="md:hidden bg-white border-b border-black/8 px-6 py-3 flex gap-3">
        <button onClick={() => navigate(`/tournaments/${id}/admin`)}
          className="flex-1 flex items-center justify-center gap-2 bg-black/5 text-black px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest">
          <Settings size={13} />Manage
        </button>
        <button onClick={() => navigate(`/tournaments/${id}/register`)}
          className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 text-black px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest">
          <Users size={13} />Register
        </button>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'overview' && <OverviewTab tournament={tournament} />}
        {activeTab === 'fixtures' && <FixturesTab tournamentId={id} />}
        {activeTab === 'points' && <PointsTab tournamentId={id} />}
        {activeTab === 'teams' && <TeamsTab tournamentId={id} />}
        {activeTab === 'players' && <PlayersTab tournamentId={id} />}
        {activeTab === 'leaderboards' && <LeaderboardsTab tournamentId={id} />}
        {activeTab === 'stats' && <StatsTab tournamentId={id} tournament={tournament} />}
        {activeTab === 'sponsors' && <SponsorsTab tournament={tournament} />}
        {activeTab === 'gallery' && <GalleryTab tournament={tournament} />}
      </div>
    </div>
  );
}

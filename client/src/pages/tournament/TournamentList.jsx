import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Trophy, Users, Calendar, MapPin, ChevronRight, Plus, Search,
  Filter, Star, Zap, Shield, Clock, DollarSign, Target, Award,
  TrendingUp, PlayCircle, CheckCircle2, AlertCircle, Globe
} from 'lucide-react';
import apiClient from '../../api/client';
import { toast } from 'react-toastify';

const StatusBadge = ({ status }) => {
  const map = {
    draft: { color: 'bg-slate-100 text-slate-600', label: 'Draft' },
    registration: { color: 'bg-blue-100 text-blue-700', label: 'Registration Open' },
    ongoing: { color: 'bg-emerald-100 text-emerald-700', label: '🔴 Live' },
    knockout: { color: 'bg-orange-100 text-orange-700', label: '⚔️ Knockout' },
    completed: { color: 'bg-slate-100 text-slate-500', label: 'Completed' },
    cancelled: { color: 'bg-red-100 text-red-500', label: 'Cancelled' },
  };
  const s = map[status] || map.draft;
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${s.color}`}>
      {s.label}
    </span>
  );
};

const TournamentCard = ({ t }) => {
  const approvedTeams = t.registeredTeams?.filter(rt => rt.approvalStatus === 'approved').length || 0;

  return (
    <Link to={`/tournaments/${t._id}`} className="group block">
      <div className="bg-white border border-black/8 rounded-3xl overflow-hidden hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-1 transition-all duration-300">
        {/* Banner */}
        <div className="relative h-36 bg-gradient-to-br from-emerald-600 to-teal-700 overflow-hidden">
          {t.banner ? (
            <img src={t.banner} alt={t.name} className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center opacity-20">
              <Trophy size={80} className="text-white" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
            <div className="flex items-center gap-2">
              {t.logo ? (
                <img src={t.logo} alt="logo" className="w-10 h-10 rounded-xl object-cover border-2 border-white shadow" />
              ) : (
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Trophy size={20} className="text-white" />
                </div>
              )}
            </div>
            <StatusBadge status={t.status} />
          </div>
        </div>

        <div className="p-5">
          <h3 className="font-black text-base uppercase tracking-tight text-black truncate mb-1">
            {t.name}
          </h3>
          
          <div className="flex items-center gap-1.5 text-slate-400 mb-4">
            <MapPin size={11} />
            <span className="text-[10px] font-bold uppercase tracking-wider truncate">
              {t.venues?.[0]?.city || t.venues?.[0]?.name || 'TBD'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { icon: Users, label: 'Teams', value: `${approvedTeams}/${t.totalTeams || '?'}` },
              { icon: Target, label: 'Format', value: t.matchFormat || 'T20' },
              { icon: Shield, label: 'Type', value: t.tournamentType?.replace('_', '+').toUpperCase() || 'LEAGUE' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-black/3 rounded-xl p-2.5 text-center">
                <Icon size={12} className="text-emerald-500 mx-auto mb-1" />
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
                <p className="text-[10px] font-black text-black mt-0.5 truncate">{value}</p>
              </div>
            ))}
          </div>

          {(t.prizePool > 0 || t.entryFee > 0) && (
            <div className="flex items-center gap-3 mb-4">
              {t.prizePool > 0 && (
                <div className="flex items-center gap-1.5 bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-1.5">
                  <Award size={11} className="text-yellow-600" />
                  <span className="text-[10px] font-black text-yellow-700">₹{t.prizePool.toLocaleString()}</span>
                </div>
              )}
              {t.entryFee > 0 && (
                <div className="flex items-center gap-1.5 bg-slate-50 border border-black/8 rounded-xl px-3 py-1.5">
                  <DollarSign size={11} className="text-slate-500" />
                  <span className="text-[10px] font-black text-slate-600">₹{t.entryFee} entry</span>
                </div>
              )}
            </div>
          )}

          {t.startDate && (
            <div className="flex items-center gap-2 text-slate-400 mb-4">
              <Calendar size={11} />
              <span className="text-[10px] font-bold">
                {new Date(t.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-black/5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {t.ballType || 'Leather'} Ball
            </span>
            <div className="flex items-center gap-1 text-emerald-600 group-hover:gap-2 transition-all">
              <span className="text-[10px] font-black uppercase tracking-widest">View</span>
              <ChevronRight size={13} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

const FILTERS = [
  { label: 'All', value: '' },
  { label: '🔴 Live', value: 'ongoing' },
  { label: '📋 Registration', value: 'registration' },
  { label: '🏆 Completed', value: 'completed' },
];

const TYPE_FILTERS = [
  { label: 'All Types', value: '' },
  { label: 'League', value: 'league' },
  { label: 'Knockout', value: 'knockout' },
  { label: 'League + Knockout', value: 'league_knockout' },
];

export default function TournamentList() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchTournaments();
  }, [status, type]);

  const fetchTournaments = async () => {
    setLoading(true);
    try {
      const params = {};
      if (status) params.status = status;
      if (type) params.type = type;
      const res = await apiClient.get('/tournaments/list', { params });
      setTournaments(res.data.tournaments || []);
    } catch (err) {
      toast.error('Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  const filtered = tournaments.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase())
  );

  const liveCount = tournaments.filter(t => t.status === 'ongoing').length;
  const registrationCount = tournaments.filter(t => t.status === 'registration').length;

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-2xl p-3">
                  <Trophy size={28} className="text-emerald-400" />
                </div>
                <div>
                  <h1 className="text-4xl font-black uppercase tracking-tighter">
                    Tournament <span className="text-emerald-400">Arena</span>
                  </h1>
                  <p className="text-emerald-400/60 text-xs font-bold uppercase tracking-[0.3em]">
                    Cricket Tournament Ecosystem
                  </p>
                </div>
              </div>
              <p className="text-white/50 text-sm font-medium max-w-md">
                Manage tournaments, track live scores, leaderboards, and compete with teams across the region.
              </p>

              {/* Quick stats */}
              <div className="flex items-center gap-6 mt-6">
                {liveCount > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-sm font-black text-white">{liveCount} Live</span>
                  </div>
                )}
                {registrationCount > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full" />
                    <span className="text-sm font-black text-white/70">{registrationCount} Registering</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Globe size={14} className="text-white/40" />
                  <span className="text-sm font-black text-white/70">{tournaments.length} Total</span>
                </div>
              </div>
            </div>

            {/* Create button */}
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/tournaments/create')}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black px-6 py-3 rounded-2xl transition-all shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95"
              >
                <Plus size={18} />
                <span className="text-sm uppercase tracking-widest">Create Tournament</span>
              </button>
              <button
                onClick={() => navigate('/tournaments/team/create')}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-black px-6 py-3 rounded-2xl transition-all border border-white/20"
              >
                <Users size={18} />
                <span className="text-sm uppercase tracking-widest">Create Team</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white border-b border-black/8 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row items-start md:items-center gap-4">
          {/* Search */}
          <div className="flex items-center gap-2 bg-black/5 rounded-xl px-4 py-2.5 border border-black/8 focus-within:border-emerald-400 transition-all flex-1 max-w-xs">
            <Search size={14} className="text-slate-400" />
            <input
              type="text"
              placeholder="Search tournaments..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent text-xs font-bold text-black placeholder-slate-400 outline-none w-full"
            />
          </div>

          {/* Status filter */}
          <div className="flex gap-2 flex-wrap">
            {FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setStatus(f.value)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  status === f.value
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'bg-black/5 text-slate-500 hover:bg-black/8'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Type filter */}
          <select
            value={type}
            onChange={e => setType(e.target.value)}
            className="bg-black/5 border border-black/8 rounded-xl px-3 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest outline-none focus:border-emerald-400"
          >
            {TYPE_FILTERS.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-3xl overflow-hidden animate-pulse">
                <div className="h-36 bg-slate-200" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-slate-200 rounded-xl w-3/4" />
                  <div className="h-3 bg-slate-100 rounded-xl w-1/2" />
                  <div className="grid grid-cols-3 gap-2">
                    {[...Array(3)].map((_, j) => <div key={j} className="h-16 bg-slate-100 rounded-xl" />)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Trophy size={40} className="text-emerald-500" />
            </div>
            <h3 className="text-xl font-black text-black uppercase tracking-tight mb-2">No Tournaments Found</h3>
            <p className="text-slate-400 text-sm font-medium mb-8">
              {search ? `No results for "${search}"` : 'Be the first to create one!'}
            </p>
            <button
              onClick={() => navigate('/tournaments/create')}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-black px-8 py-3 rounded-2xl transition-all shadow-lg shadow-emerald-500/20"
            >
              Create Tournament
            </button>
          </div>
        ) : (
          <>
            {/* Live tournaments */}
            {filtered.some(t => t.status === 'ongoing') && (
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <h2 className="text-sm font-black uppercase tracking-widest text-black">Live Now</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filtered.filter(t => t.status === 'ongoing').map(t => (
                    <TournamentCard key={t._id} t={t} />
                  ))}
                </div>
              </div>
            )}

            {/* Other tournaments */}
            {filtered.some(t => t.status !== 'ongoing') && (
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-black mb-6">
                  {filtered.some(t => t.status === 'ongoing') ? 'All Tournaments' : 'Tournaments'}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filtered.filter(t => t.status !== 'ongoing').map(t => (
                    <TournamentCard key={t._id} t={t} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Trash2, Search, Shield, ChevronDown, ChevronRight,
  AlertTriangle, CheckCircle, X, RefreshCw, Trophy, MapPin,
  User, Phone, Loader2, QrCode, ExternalLink, Crown
} from 'lucide-react';
import apiClient from '../../api/client';
import { toast } from 'react-toastify';

/* ─────────────────────────────────────────────────────────────────
   ADMIN TEAM MANAGER
   Admin can: view all teams + players, delete any team, delete any player.
   Admin CANNOT: create or edit teams.
───────────────────────────────────────────────────────────────── */
export default function AdminTeamManager() {
  const navigate = useNavigate();

  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedTeamId, setExpandedTeamId] = useState(null);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    type: null, // 'team' | 'player'
    teamId: null,
    teamName: '',
    playerId: null,
    playerName: '',
  });
  const [deleting, setDeleting] = useState(false);

  // Stats
  const [stats, setStats] = useState({ total: 0, totalPlayers: 0 });

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/teams/admin/all', {
        params: { search, limit: 100 }
      });
      if (res.data.success) {
        setTeams(res.data.teams);
        setStats({ total: res.data.total, totalPlayers: res.data.totalPlayers });
      } else {
        toast.error(res.data.message || 'Failed to load teams');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      if (err.response?.status === 403) {
        toast.error('Admin access required.');
        navigate('/admin');
      } else {
        toast.error(msg || 'Error loading teams');
      }
    } finally {
      setLoading(false);
    }
  }, [search, navigate]);

  useEffect(() => {
    const t = setTimeout(fetchTeams, 300);
    return () => clearTimeout(t);
  }, [fetchTeams]);

  // ── Delete Team ──
  const openDeleteTeam = (team) => {
    setConfirmModal({
      open: true, type: 'team',
      teamId: team._id, teamName: team.name,
      playerId: null, playerName: '',
    });
  };

  // ── Delete Player ──
  const openDeletePlayer = (team, player) => {
    setConfirmModal({
      open: true, type: 'player',
      teamId: team._id, teamName: team.name,
      playerId: player.user_id?._id || player.user_id,
      playerName: player.name || player.user_id?.name || 'Player',
    });
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      if (confirmModal.type === 'team') {
        const res = await apiClient.delete(`/teams/admin/${confirmModal.teamId}`);
        if (res.data.success) {
          toast.success(res.data.message);
          setTeams(prev => prev.filter(t => t._id !== confirmModal.teamId));
          setStats(prev => ({ ...prev, total: prev.total - 1 }));
        } else {
          toast.error(res.data.message);
        }
      } else {
        const res = await apiClient.delete(
          `/teams/admin/${confirmModal.teamId}/players/${confirmModal.playerId}`
        );
        if (res.data.success) {
          toast.success(res.data.message);
          setTeams(prev => prev.map(t => {
            if (t._id !== confirmModal.teamId) return t;
            return {
              ...t,
              players: t.players.filter(p =>
                (p.user_id?._id || p.user_id)?.toString() !== confirmModal.playerId
              )
            };
          }));
        } else {
          toast.error(res.data.message);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeleting(false);
      setConfirmModal(prev => ({ ...prev, open: false }));
    }
  };

  const toggleExpand = (teamId) => {
    setExpandedTeamId(prev => prev === teamId ? null : teamId);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] bg-red-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-[-5%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 pt-8 relative z-10 space-y-8">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 bg-red-500/20 border border-red-500/30 rounded-2xl flex items-center justify-center">
                <Shield size={18} className="text-red-400" />
              </div>
              <h1 className="text-2xl font-black uppercase italic tracking-tighter text-slate-100">
                Team Manager
              </h1>
            </div>
            <p className="text-xs text-slate-400 uppercase tracking-widest font-bold ml-13 pl-13">
              Admin Control · View, monitor and remove teams & players
            </p>
          </div>
          <button
            onClick={fetchTeams}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* ── Stats Bar ── */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Total Teams', value: stats.total, icon: Trophy, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
            { label: 'Total Players', value: stats.totalPlayers, icon: Users, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} border ${s.border} rounded-2xl p-5 flex items-center gap-4`}>
              <div className={`p-3 rounded-xl ${s.bg} border ${s.border}`}>
                <s.icon size={18} className={s.color} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Search Bar ── */}
        <div className="relative">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search teams by name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-900/80 border border-white/10 focus:border-red-500/30 rounded-2xl pl-11 pr-5 py-4 text-sm font-bold text-slate-200 placeholder:text-slate-600 outline-none transition-all backdrop-blur-xl"
          />
        </div>

        {/* ── Team List ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Loader2 size={40} className="animate-spin text-red-500/60" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Loading registry...</p>
          </div>
        ) : teams.length === 0 ? (
          <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-16 text-center">
            <Trophy size={40} className="text-slate-600 mx-auto mb-4" />
            <p className="text-sm font-black uppercase tracking-wider text-slate-400">No teams found</p>
            <p className="text-xs text-slate-500 mt-2">Try adjusting your search filter</p>
          </div>
        ) : (
          <div className="space-y-3">
            {teams.map(team => {
              const isExpanded = expandedTeamId === team._id;
              const captain = team.captain;
              const playerCount = team.players?.length || 0;
              const winRate = team.stats?.matches > 0
                ? Math.round((team.stats.wins / team.stats.matches) * 100)
                : 0;

              return (
                <div
                  key={team._id}
                  className="bg-slate-900/70 border border-white/8 rounded-3xl overflow-hidden backdrop-blur-xl transition-all duration-300 hover:border-white/15"
                >
                  {/* Team row */}
                  <div className="flex items-center gap-4 p-5">
                    {/* Logo / Avatar */}
                    {team.logo ? (
                      <img src={team.logo} alt={team.name} className="w-12 h-12 rounded-2xl object-cover border border-white/10 flex-shrink-0" />
                    ) : (
                      <div
                        className="w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center text-white font-black text-xl border border-white/10"
                        style={{ background: `linear-gradient(135deg, ${team.primaryColor || '#10b981'}, ${team.primaryColor || '#10b981'}60)` }}
                      >
                        {team.name?.[0]}
                      </div>
                    )}

                    {/* Team info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-sm text-slate-100 uppercase tracking-tight">{team.name}</h3>
                        {team.shortName && (
                          <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-md text-[9px] font-black uppercase tracking-widest text-slate-400">{team.shortName}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {team.city && (
                          <span className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                            <MapPin size={10} /> {team.city}
                          </span>
                        )}
                        {captain && (
                          <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                            <Crown size={10} /> {captain.name}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                          <Users size={10} /> {playerCount} players
                        </span>
                        {team.stats?.matches > 0 && (
                          <span className="flex items-center gap-1 text-[10px] text-indigo-400 font-bold">
                            <Trophy size={10} /> {winRate}% win rate
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => toggleExpand(team._id)}
                        title="View players"
                        className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all"
                      >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                      <button
                        onClick={() => navigate(`/team/${team._id}`)}
                        title="View team profile"
                        className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all"
                      >
                        <ExternalLink size={14} />
                      </button>
                      <button
                        onClick={() => openDeleteTeam(team)}
                        title="Delete team"
                        className="p-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 rounded-xl text-red-400 hover:text-red-300 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Player List */}
                  {isExpanded && (
                    <div className="border-t border-white/8 bg-slate-950/40 px-5 py-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <Users size={11} /> Squad Roster ({playerCount})
                      </p>
                      {playerCount === 0 ? (
                        <p className="text-xs text-slate-500 font-medium italic">No players in this squad.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {team.players.map((player, idx) => {
                            const pId = player.user_id?._id || player.user_id;
                            const pName = player.name || player.user_id?.name || 'Unknown';
                            const pPhone = player.mobile || player.user_id?.phone || '';
                            const isCapt = captain?._id === pId?.toString() || captain?._id === pId;

                            return (
                              <div
                                key={idx}
                                className="flex items-center justify-between bg-white/3 border border-white/8 rounded-xl px-4 py-3 group hover:border-white/15 transition-all"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 flex-shrink-0">
                                    <User size={14} className="text-slate-400" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <p className="text-xs font-black text-slate-200 truncate uppercase">{pName}</p>
                                      {isCapt && (
                                        <span className="bg-emerald-500/20 text-emerald-400 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">C</span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{player.role || 'All-rounder'}</p>
                                      {pPhone && (
                                        <p className="text-[9px] text-slate-500 flex items-center gap-0.5">
                                          <Phone size={8} /> {pPhone}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {pId && (
                                  <button
                                    onClick={() => openDeletePlayer(team, player)}
                                    title="Remove player"
                                    className="opacity-0 group-hover:opacity-100 p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-red-400 transition-all"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Confirm Delete Modal ── */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => !deleting && setConfirmModal(prev => ({ ...prev, open: false }))}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

          {/* Modal */}
          <div
            className="relative bg-slate-900 border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => !deleting && setConfirmModal(prev => ({ ...prev, open: false }))}
              className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 transition-all"
            >
              <X size={14} />
            </button>

            {/* Icon */}
            <div className="w-16 h-16 bg-red-500/20 border border-red-500/30 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={28} className="text-red-400" />
            </div>

            <h2 className="text-xl font-black uppercase tracking-tight text-center text-slate-100 mb-2">
              {confirmModal.type === 'team' ? 'Delete Team?' : 'Remove Player?'}
            </h2>
            <p className="text-center text-slate-400 text-sm mb-2">
              {confirmModal.type === 'team'
                ? <>You are about to permanently delete <strong className="text-white">{confirmModal.teamName}</strong> and all its data. This cannot be undone.</>
                : <>Remove <strong className="text-white">{confirmModal.playerName}</strong> from <strong className="text-white">{confirmModal.teamName}</strong>?</>
              }
            </p>

            {confirmModal.type === 'team' && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-6 text-center">
                <p className="text-xs text-red-300 font-bold">⚠️ All player records in this team will be removed.</p>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => !deleting && setConfirmModal(prev => ({ ...prev, open: false }))}
                disabled={deleting}
                className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-300 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex-1 py-3.5 bg-red-600 hover:bg-red-500 rounded-2xl text-xs font-black uppercase tracking-widest text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
              >
                {deleting
                  ? <><Loader2 size={13} className="animate-spin" /> Deleting...</>
                  : <><Trash2 size={13} /> Confirm Delete</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

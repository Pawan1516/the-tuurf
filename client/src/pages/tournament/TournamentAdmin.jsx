import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Trophy, Users, Calendar, CheckCircle2, XCircle, Settings,
  BarChart3, PlayCircle, UserPlus, Shield, Zap, AlertCircle,
  TrendingUp, Target, Award
} from 'lucide-react';
import apiClient from '../../api/client';
import { toast } from 'react-toastify';

export default function TournamentAdmin() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('teams');
  const [generating, setGenerating] = useState(false);
  const [awarding, setAwarding] = useState(false);

  useEffect(() => {
    fetchTournament();
  }, [id]);

  const fetchTournament = async () => {
    try {
      const res = await apiClient.get(`/tournaments/${id}`);
      setTournament(res.data.tournament);
    } catch {
      toast.error('Failed to load tournament');
    } finally {
      setLoading(false);
    }
  };

  const approveTeam = async (teamId) => {
    try {
      await apiClient.post(`/tournaments/${id}/approve-team`, { teamId });
      toast.success('Team approved ✅');
      fetchTournament();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const rejectTeam = async (teamId) => {
    try {
      await apiClient.post(`/tournaments/${id}/reject-team`, { teamId });
      toast.success('Team rejected');
      fetchTournament();
    } catch {}
  };

  const generateFixtures = async () => {
    if (!window.confirm('Generate league fixtures for all approved teams?')) return;
    setGenerating(true);
    try {
      const res = await apiClient.post(`/tournaments/${id}/generate-fixtures`, {
        startDate: tournament.startDate
      });
      if (res.data.success) {
        toast.success(`${res.data.matchesCreated} fixtures generated! 🗓️`);
        fetchTournament();
        navigate(`/tournaments/${id}?tab=fixtures`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate fixtures');
    } finally {
      setGenerating(false);
    }
  };

  const generateKnockout = async () => {
    if (!window.confirm('Generate knockout bracket from top teams in points table?')) return;
    setGenerating(true);
    try {
      const res = await apiClient.post(`/tournaments/${id}/generate-knockout`);
      if (res.data.success) {
        toast.success('Knockout bracket generated! ⚔️');
        fetchTournament();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setGenerating(false);
    }
  };

  const finalizeAwards = async () => {
    if (!window.confirm('Auto-assign tournament awards based on statistics?')) return;
    setAwarding(true);
    try {
      const res = await apiClient.post(`/tournaments/${id}/finalize-awards`);
      if (res.data.success) {
        toast.success('Awards assigned! 🏆');
        fetchTournament();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setAwarding(false);
    }
  };

  const updateStatus = async (status) => {
    try {
      await apiClient.put(`/tournaments/${id}`, { status });
      toast.success(`Status updated to ${status}`);
      fetchTournament();
    } catch {}
  };

  if (loading) return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );

  if (!tournament) return null;

  const pendingTeams = tournament.registeredTeams?.filter(t => t.approvalStatus === 'pending') || [];
  const approvedTeams = tournament.registeredTeams?.filter(t => t.approvalStatus === 'approved') || [];
  const leagueMatchCount = tournament.leagueMatches?.length || 0;

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white py-10 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => navigate(`/tournaments/${id}`)} className="text-white/40 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors">
              ← Tournament
            </button>
            <span className="text-white/20">/</span>
            <span className="text-white/60 text-xs font-bold uppercase tracking-widest">Admin Panel</span>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-white">{tournament.name}</h1>
              <p className="text-white/40 text-xs font-bold mt-1 uppercase tracking-widest">Tournament Management</p>
            </div>
            <div className="flex gap-2">
              {['draft', 'registration', 'ongoing', 'completed'].map(s => (
                <button
                  key={s}
                  onClick={() => updateStatus(s)}
                  className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                    tournament.status === s
                      ? 'bg-emerald-500 text-black'
                      : 'bg-white/10 text-white/50 hover:bg-white/20'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="bg-white border-b border-black/8 px-6 py-4">
        <div className="max-w-5xl mx-auto grid grid-cols-4 gap-4">
          {[
            { label: 'Total Teams', value: tournament.registeredTeams?.length || 0, icon: Users, color: 'text-black' },
            { label: 'Approved', value: approvedTeams.length, icon: CheckCircle2, color: 'text-emerald-600' },
            { label: 'Pending', value: pendingTeams.length, icon: AlertCircle, color: 'text-orange-500' },
            { label: 'Matches', value: leagueMatchCount, icon: Calendar, color: 'text-blue-600' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <s.icon size={16} className={`${s.color} mx-auto mb-1`} />
              <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button
            onClick={generateFixtures}
            disabled={generating || approvedTeams.length < 2}
            className="bg-white border border-black/8 rounded-2xl p-5 text-left hover:shadow-md hover:-translate-y-0.5 transition-all disabled:opacity-50 group"
          >
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-emerald-500 transition-colors">
              <Calendar size={18} className="text-emerald-600 group-hover:text-white" />
            </div>
            <p className="font-black text-sm text-black uppercase tracking-tight">Generate Fixtures</p>
            <p className="text-[10px] text-slate-400 mt-1">
              {approvedTeams.length < 2 ? `Need ${2 - approvedTeams.length} more approved team(s)` : `Create league for ${approvedTeams.length} teams`}
            </p>
            {generating && <div className="mt-2 w-4 h-4 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />}
          </button>

          {tournament.tournamentType === 'league_knockout' && (
            <button
              onClick={generateKnockout}
              disabled={generating || leagueMatchCount === 0}
              className="bg-white border border-black/8 rounded-2xl p-5 text-left hover:shadow-md hover:-translate-y-0.5 transition-all disabled:opacity-50 group"
            >
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-orange-500 transition-colors">
                <Trophy size={18} className="text-orange-600 group-hover:text-white" />
              </div>
              <p className="font-black text-sm text-black uppercase tracking-tight">Generate Knockout</p>
              <p className="text-[10px] text-slate-400 mt-1">Create knockout bracket from top teams</p>
            </button>
          )}

          <button
            onClick={finalizeAwards}
            disabled={awarding || tournament.status !== 'completed'}
            className="bg-white border border-black/8 rounded-2xl p-5 text-left hover:shadow-md hover:-translate-y-0.5 transition-all disabled:opacity-50 group"
          >
            <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-yellow-400 transition-colors">
              <Award size={18} className="text-yellow-600" />
            </div>
            <p className="font-black text-sm text-black uppercase tracking-tight">Finalize Awards</p>
            <p className="text-[10px] text-slate-400 mt-1">
              {tournament.status !== 'completed' ? 'Mark tournament as completed first' : 'Auto-assign Orange Cap, Purple Cap, MVP'}
            </p>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'teams', label: `Teams (${tournament.registeredTeams?.length || 0})` },
            { id: 'officials', label: 'Scorers & Umpires' },
            { id: 'settings', label: 'Settings' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === t.id ? 'bg-black text-white' : 'bg-black/5 text-slate-500 hover:bg-black/8'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Teams Tab */}
        {activeTab === 'teams' && (
          <div className="space-y-3">
            {pendingTeams.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
                  <p className="text-xs font-black text-orange-600 uppercase tracking-widest">Pending Approval ({pendingTeams.length})</p>
                </div>
                {pendingTeams.map(rt => (
                  <TeamRow key={rt.team_id?._id || rt.team_id} rt={rt} onApprove={approveTeam} onReject={rejectTeam} />
                ))}
              </div>
            )}

            {approvedTeams.length > 0 && (
              <div>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3">Approved Teams ({approvedTeams.length})</p>
                {approvedTeams.map(rt => (
                  <TeamRow key={rt.team_id?._id || rt.team_id} rt={rt} approved onApprove={approveTeam} onReject={rejectTeam} />
                ))}
              </div>
            )}

            {tournament.registeredTeams?.length === 0 && (
              <div className="text-center py-12 bg-white border border-black/8 rounded-2xl">
                <Users size={36} className="text-slate-300 mx-auto mb-3" />
                <p className="font-black text-slate-400 text-sm">No teams registered yet</p>
              </div>
            )}
          </div>
        )}

        {/* Officials Tab */}
        {activeTab === 'officials' && (
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white border border-black/8 rounded-2xl p-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Scorers</h3>
              <OfficialList list={tournament.scorers} role="scorer" tournamentId={id} onAdd={fetchTournament} />
            </div>
            <div className="bg-white border border-black/8 rounded-2xl p-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Umpires</h3>
              <OfficialList list={tournament.umpires} role="umpire" tournamentId={id} onAdd={fetchTournament} />
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="bg-white border border-black/8 rounded-2xl p-6">
            <p className="text-sm font-black text-black mb-4">Tournament Settings</p>
            <div className="space-y-4">
              {[
                { label: 'Tournament Name', value: tournament.name },
                { label: 'Type', value: tournament.tournamentType },
                { label: 'Format', value: tournament.matchFormat },
                { label: 'Overs', value: tournament.oversPerMatch },
                { label: 'Max Teams', value: tournament.totalTeams },
                { label: 'Ball Type', value: tournament.ballType },
              ].map(s => (
                <div key={s.label} className="flex justify-between items-center border-b border-black/5 pb-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</span>
                  <span className="text-xs font-black text-black">{s.value}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate(`/tournaments/${id}`)}
              className="mt-6 w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black py-3 rounded-xl uppercase tracking-widest text-xs transition-all"
            >
              View Tournament Page
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const TeamRow = ({ rt, approved, onApprove, onReject }) => {
  const team = rt.team_id;
  const name = team?.name || `Team ${rt.team_id?.toString?.()?.slice(-4) || '?'}`;
  const logo = team?.logo;

  return (
    <div className={`bg-white border rounded-2xl p-4 flex items-center gap-4 mb-2 ${approved ? 'border-emerald-200 bg-emerald-50/20' : 'border-orange-200 bg-orange-50/20'}`}>
      {logo ? (
        <img src={logo} alt={name} className="w-10 h-10 rounded-xl object-cover" />
      ) : (
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${approved ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
          {name[0]}
        </div>
      )}
      <div className="flex-1">
        <p className="font-black text-sm text-black">{name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {team?.city && <span className="text-[9px] text-slate-400 font-bold">{team.city}</span>}
          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
            rt.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-600'
          }`}>
            {rt.paymentStatus || 'Pending'}
          </span>
        </div>
      </div>
      {!approved ? (
        <div className="flex gap-2">
          <button
            onClick={() => onApprove(team?._id || rt.team_id)}
            className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-400 text-black font-black px-3 py-2 rounded-xl text-[10px] uppercase tracking-widest"
          >
            <CheckCircle2 size={13} />Approve
          </button>
          <button
            onClick={() => onReject(team?._id || rt.team_id)}
            className="bg-red-50 hover:bg-red-100 text-red-500 font-black px-3 py-2 rounded-xl text-[10px]"
          >
            <XCircle size={13} />
          </button>
        </div>
      ) : (
        <CheckCircle2 size={18} className="text-emerald-500" />
      )}
    </div>
  );
};

const OfficialList = ({ list = [], role, tournamentId, onAdd }) => {
  const [userId, setUserId] = useState('');

  const handleAdd = async () => {
    if (!userId.trim()) return;
    try {
      await apiClient.post(`/tournaments/${tournamentId}/add-official`, { userId: userId.trim(), role });
      toast.success(`${role} added`);
      setUserId('');
      onAdd?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <div>
      {list.length === 0 ? (
        <p className="text-slate-300 text-xs font-bold mb-4">No {role}s assigned</p>
      ) : (
        <div className="space-y-2 mb-4">
          {list.map((u, i) => (
            <div key={i} className="flex items-center gap-3 bg-black/3 rounded-xl px-3 py-2">
              <Shield size={13} className="text-emerald-500" />
              <p className="text-xs font-bold text-black">{u.name || u.email || u.toString?.()}</p>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder={`User ID or Email`}
          value={userId}
          onChange={e => setUserId(e.target.value)}
          className="flex-1 bg-black/3 border border-black/10 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-emerald-500"
        />
        <button onClick={handleAdd} className="bg-emerald-500 hover:bg-emerald-400 text-black font-black px-4 py-2 rounded-xl text-xs uppercase tracking-widest">Add</button>
      </div>
    </div>
  );
};

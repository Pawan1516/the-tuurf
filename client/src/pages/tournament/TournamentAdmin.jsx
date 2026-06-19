import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Trophy, Users, Calendar, CheckCircle2, XCircle, Settings,
  BarChart3, PlayCircle, UserPlus, Shield, Zap, AlertCircle,
  TrendingUp, Target, Award, Download, DollarSign, RefreshCw,
  QrCode, Info
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
  const [fixtures, setFixtures] = useState([]);
  const [knockoutRounds, setKnockoutRounds] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  
  // Financials State
  const [financials, setFinancials] = useState(null);
  const [loadingFinancials, setLoadingFinancials] = useState(false);

  useEffect(() => {
    if (activeTab === 'fixtures') {
      fetchFixtures();
    } else if (activeTab === 'financials') {
      fetchFinancials();
    }
  }, [activeTab]);

  const fetchFixtures = async () => {
    try {
      const res = await apiClient.get(`/tournaments/${id}/fixtures`);
      if (res.data.success) {
        setFixtures(res.data.leagueMatches || []);
        setKnockoutRounds(res.data.knockoutRounds || []);
      }
    } catch {
      toast.error('Failed to load fixtures');
    }
  };

  const fetchFinancials = async () => {
    try {
      setLoadingFinancials(true);
      const res = await apiClient.get(`/tournaments/${id}/financial-summary`);
      if (res.data.success) {
        setFinancials(res.data.financials);
      }
    } catch {
      toast.error('Failed to load financials');
    } finally {
      setLoadingFinancials(false);
    }
  };

  const startMatch = async (matchId) => {
    if (!window.confirm('Are you sure you want to start this match?')) return;
    try {
      const res = await apiClient.post(`/tournaments/${id}/matches/${matchId}/start`);
      if (res.data.success) {
        toast.success('Match started! Redirecting to scoreboard...');
        navigate(`/match/scoring/${matchId}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start match');
    }
  };

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

  const approvePayment = async (teamId) => {
    if (!window.confirm('Mark this team entry fee as Paid and Approve them?')) return;
    try {
      await apiClient.post(`/tournaments/${id}/approve-payment`, { teamId });
      toast.success('Payment approved and team registered ✅');
      fetchTournament();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve payment');
    }
  };

  const controlTournament = async (action, reason = '') => {
    if (!window.confirm(`Are you sure you want to ${action} this tournament?`)) return;
    try {
      const res = await apiClient.post(`/tournaments/${id}/control`, { action, reason });
      if (res.data.success) {
        toast.success(`Action '${action}' successful!`);
        fetchTournament();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  const handleExport = async (reportType) => {
    try {
      const response = await apiClient.get(`/tournaments/${id}/export/${reportType}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}_${id}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`${reportType?.replace('-', ' ')} exported! 📥`);
    } catch (err) {
      toast.error("Failed to export report");
    }
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
            <div className="flex gap-2 items-center flex-wrap">
              {/* Start */}
              {(tournament.status === 'draft' || tournament.status === 'registration') && (
                <button
                  onClick={() => controlTournament('start')}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                >
                  ⚡ Start Tournament
                </button>
              )}

              {/* Pause / Resume */}
              {tournament.status === 'ongoing' && (
                tournament.pausedAt ? (
                  <button
                    onClick={() => controlTournament('resume')}
                    className="bg-sky-500 hover:bg-sky-400 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                  >
                    ▶️ Resume Tournament
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const reason = window.prompt("Reason for pausing:", "Rain delay");
                      if (reason !== null) controlTournament('pause', reason);
                    }}
                    className="bg-amber-500 hover:bg-amber-400 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                  >
                    ⏸️ Pause Tournament
                  </button>
                )
              )}

              {/* End */}
              {(tournament.status === 'ongoing' || tournament.status === 'knockout') && (
                <button
                  onClick={() => controlTournament('end')}
                  className="bg-rose-500 hover:bg-rose-450 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                >
                  🟥 End Tournament
                </button>
              )}

              {/* Archive */}
              {tournament.status === 'completed' && (
                <button
                  onClick={() => controlTournament('archive')}
                  className="bg-zinc-600 hover:bg-zinc-500 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                >
                  📁 Archive Tournament
                </button>
              )}
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

        {/* Tournament Control Panel */}
        <div className="bg-white border border-black/8 rounded-2xl p-5 mb-6">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Tournament Control</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => controlTournament('start')}
              disabled={tournament.status === 'ongoing' || tournament.status === 'completed'}
              className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest transition-all"
            >
              <PlayCircle size={13} />Start
            </button>
            <button
              onClick={() => {
                const reason = window.prompt('Pause reason (e.g. Rain delay):') || 'Paused';
                controlTournament('pause', reason);
              }}
              disabled={tournament.status !== 'ongoing'}
              className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest transition-all"
            >
              <AlertCircle size={13} />Pause
            </button>
            <button
              onClick={() => controlTournament('resume')}
              disabled={!tournament.pausedAt}
              className="flex items-center gap-1.5 bg-sky-400 hover:bg-sky-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest transition-all"
            >
              <RefreshCw size={13} />Resume
            </button>
            <button
              onClick={() => controlTournament('end')}
              disabled={tournament.status === 'completed' || tournament.status === 'draft'}
              className="flex items-center gap-1.5 bg-red-500 hover:bg-red-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest transition-all"
            >
              <XCircle size={13} />End Tournament
            </button>
            <button
              onClick={() => controlTournament('archive')}
              className="flex items-center gap-1.5 bg-black/8 hover:bg-black/12 text-slate-600 font-black px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest transition-all"
            >
              <Award size={13} />Archive
            </button>
          </div>
          {tournament.pausedAt && (
            <div className="mt-3 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              <p className="text-xs font-bold text-amber-700">Paused: {tournament.pauseReason || 'No reason given'}</p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { id: 'teams', label: `Teams (${tournament.registeredTeams?.length || 0})` },
            { id: 'fixtures', label: `Fixtures (${leagueMatchCount})` },
            { id: 'officials', label: 'Scorers & Umpires' },
            { id: 'financials', label: 'Financials' },
            { id: 'export', label: 'Export' },
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
                  <TeamRow key={rt.team_id?._id || rt.team_id} rt={rt} onApprove={approveTeam} onReject={rejectTeam} onMarkPaid={approvePayment} entryFee={tournament.entryFee} />
                ))}
              </div>
            )}

            {approvedTeams.length > 0 && (
              <div>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3">Approved Teams ({approvedTeams.length})</p>
                {approvedTeams.map(rt => (
                  <TeamRow key={rt.team_id?._id || rt.team_id} rt={rt} approved onApprove={approveTeam} onReject={rejectTeam} onMarkPaid={approvePayment} entryFee={tournament.entryFee} />
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

        {/* Fixtures Tab */}
        {activeTab === 'fixtures' && (
          <div className="space-y-6">
            {/* League Stage */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest">League Matches ({fixtures.length})</h3>
                {fixtures.length === 0 && approvedTeams.length >= 2 && (
                  <button
                    onClick={generateFixtures}
                    disabled={generating}
                    className="bg-emerald-500 hover:bg-emerald-400 text-black font-black px-4 py-2 rounded-xl text-xs uppercase tracking-widest transition-all"
                  >
                    Generate Fixtures
                  </button>
                )}
              </div>

              {fixtures.length === 0 ? (
                <div className="text-center py-12 bg-white border border-black/8 rounded-2xl">
                  <Calendar size={36} className="text-slate-300 mx-auto mb-3" />
                  <p className="font-black text-slate-400 text-sm">No league matches generated yet</p>
                  <p className="text-slate-300 text-xs mt-1">Approve teams and click Generate Fixtures to begin.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {fixtures.map((m) => {
                    const isPending = m.status === 'Pending' || m.status === 'Scheduled' || m.status === 'Approved';
                    const isInProgress = m.status === 'In Progress';
                    const isCompleted = m.status === 'Completed';

                    return (
                      <div key={m._id} className="bg-white border border-black/8 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-sm transition-all">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Match {m.matchNumber || '#'}</span>
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${
                              isCompleted ? 'bg-emerald-100 text-emerald-700' :
                              isInProgress ? 'bg-red-100 text-red-600 animate-pulse' :
                              'bg-zinc-100 text-zinc-500'
                            }`}>
                              {m.status}
                            </span>
                            {m.scheduledAt && (
                              <span className="text-[10px] font-bold text-slate-400">
                                {new Date(m.scheduledAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                            <button
                              onClick={() => setSelectedMatch(m)}
                              className="p-1 bg-slate-100 hover:bg-blue-500 hover:text-white rounded-lg transition-all text-slate-500 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest"
                              title="Show Match QR Code"
                            >
                              <QrCode size={12} /> QR
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-black">{m.team_a?.team_id?.name || 'TBA'}</span>
                            <span className="text-xs font-black text-slate-300">vs</span>
                            <span className="font-black text-sm text-black">{m.team_b?.team_id?.name || 'TBA'}</span>
                          </div>
                          {isCompleted && m.result && (
                            <p className="text-xs text-emerald-600 font-bold mt-1">
                              Result: {m.result.winner?.name || 'Draw'} won by {m.result.margin} {m.result.won_by}
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2">
                          {isPending && (
                            <button
                              onClick={() => startMatch(m._id)}
                              className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-widest shadow-sm active:scale-95 transition-all"
                            >
                              <PlayCircle size={14} /> Start Match
                            </button>
                          )}
                          {isInProgress && (
                            <button
                              onClick={() => navigate(`/match/scoring/${m._id}`)}
                              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-widest shadow-sm active:scale-95 transition-all"
                            >
                              <PlayCircle size={14} className="animate-pulse" /> Live Scoring
                            </button>
                          )}
                          <button
                            onClick={() => navigate(isCompleted ? `/match/result/${m._id}` : `/live/${m._id}`)}
                            className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-widest active:scale-95 transition-all"
                          >
                            Details
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Knockout Stage */}
            {knockoutRounds.length > 0 && (
              <div className="pt-4 border-t border-black/5">
                <h3 className="text-xs font-black text-orange-600 uppercase tracking-widest mb-4">Knockout Bracket</h3>
                <div className="space-y-6">
                  {knockoutRounds.map((round, ri) => (
                    <div key={ri} className="space-y-3">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{round.round || 'Round'}</p>
                      {round.matches?.map((m) => {
                        const isPending = m.status === 'Pending' || m.status === 'Scheduled' || m.status === 'Approved';
                        const isInProgress = m.status === 'In Progress';
                        const isCompleted = m.status === 'Completed';

                        return (
                          <div key={m._id} className="bg-white border border-black/8 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-sm transition-all">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${
                                  isCompleted ? 'bg-emerald-100 text-emerald-700' :
                                  isInProgress ? 'bg-red-100 text-red-600 animate-pulse' :
                                  'bg-zinc-100 text-zinc-500'
                                }`}>
                                  {m.status}
                                </span>
                                <button
                                  onClick={() => setSelectedMatch(m)}
                                  className="p-1 bg-slate-100 hover:bg-blue-500 hover:text-white rounded-lg transition-all text-slate-500 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest"
                                  title="Show Match QR Code"
                                >
                                  <QrCode size={12} /> QR
                                </button>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-sm text-black">{m.team_a?.team_id?.name || 'TBA'}</span>
                                <span className="text-xs font-black text-slate-300">vs</span>
                                <span className="font-black text-sm text-black">{m.team_b?.team_id?.name || 'TBA'}</span>
                              </div>
                              {isCompleted && m.result && (
                                <p className="text-xs text-emerald-600 font-bold mt-1">
                                  Result: {m.result.winner?.name || 'Draw'} won by {m.result.margin} {m.result.won_by}
                                </p>
                              )}
                            </div>

                            <div className="flex gap-2">
                              {isPending && (
                                <button
                                  onClick={() => startMatch(m._id)}
                                  className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-widest shadow-sm active:scale-95 transition-all"
                                >
                                  <PlayCircle size={14} /> Start Match
                                </button>
                              )}
                              {isInProgress && (
                                <button
                                  onClick={() => navigate(`/match/scoring/${m._id}`)}
                                  className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-widest shadow-sm active:scale-95 transition-all"
                                >
                                  <PlayCircle size={14} className="animate-pulse" /> Live Scoring
                                </button>
                              )}
                              <button
                                onClick={() => navigate(isCompleted ? `/match/result/${m._id}` : `/live/${m._id}`)}
                                className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-widest active:scale-95 transition-all"
                              >
                                Details
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <QRModal 
              isOpen={!!selectedMatch}
              onClose={() => setSelectedMatch(null)}
              title={selectedMatch ? (selectedMatch.matchTitle || `${selectedMatch.team_a?.team_id?.name || 'Team A'} vs ${selectedMatch.team_b?.team_id?.name || 'Team B'}`) : ''}
              qrCodeImage={selectedMatch?.qrCodeImage}
              code={selectedMatch?.qrCode}
              downloadFileName={`match_${selectedMatch?.qrCode || 'code'}.png`}
            />
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

        {/* Financials Tab */}
        {activeTab === 'financials' && (
          <div className="space-y-4">
            {loadingFinancials ? (
              <div className="text-center py-16"><div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto" /></div>
            ) : financials ? (
              <>
                {/* Revenue Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Entry Fee', value: `₹${financials.entryFee?.toLocaleString()}`, icon: DollarSign, color: 'bg-violet-100 text-violet-600' },
                    { label: 'Teams Registered', value: financials.totalTeams, icon: Users, color: 'bg-sky-100 text-sky-600' },
                    { label: 'Revenue Collected', value: `₹${financials.totalRevenueCollected?.toLocaleString()}`, icon: TrendingUp, color: 'bg-emerald-100 text-emerald-600' },
                    { label: 'Prize Pool', value: `₹${financials.prizePool?.toLocaleString()}`, icon: Trophy, color: 'bg-yellow-100 text-yellow-600' },
                  ].map(card => (
                    <div key={card.label} className="bg-white border border-black/8 rounded-2xl p-4">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${card.color}`}>
                        <card.icon size={16} />
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{card.label}</p>
                      <p className="text-xl font-black text-black mt-1">{card.value}</p>
                    </div>
                  ))}
                </div>

                {/* Payment Breakdown */}
                <div className="bg-white border border-black/8 rounded-2xl p-5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Payment Status Breakdown</p>
                  <div className="space-y-3">
                    {[
                      { label: 'Paid Teams', value: financials.paidTeams, total: financials.totalTeams, color: 'bg-emerald-500' },
                      { label: 'Approved Teams', value: financials.approvedTeams, total: financials.totalTeams, color: 'bg-sky-500' },
                      { label: 'Pending Payment', value: financials.totalTeams - financials.paidTeams, total: financials.totalTeams, color: 'bg-orange-400' },
                    ].map(row => (
                      <div key={row.label}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-black">{row.label}</span>
                          <span className="text-xs font-black text-slate-500">{row.value}/{row.total}</span>
                        </div>
                        <div className="h-2 bg-black/5 rounded-full overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all duration-700 ${row.color}`}
                            style={{ width: row.total > 0 ? `${(row.value / row.total) * 100}%` : '0%' }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Revenue vs Prize */}
                <div className="bg-white border border-black/8 rounded-2xl p-5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Revenue vs Prize Pool</p>
                  <div className="flex items-end gap-4 h-24">
                    {[
                      { label: 'Collected', value: financials.totalRevenueCollected, max: Math.max(financials.totalRevenueCollected, financials.prizePool, 1), color: 'bg-emerald-500' },
                      { label: 'Potential', value: financials.potentialRevenue, max: Math.max(financials.totalRevenueCollected, financials.prizePool, 1), color: 'bg-sky-400' },
                      { label: 'Prize Pool', value: financials.prizePool, max: Math.max(financials.totalRevenueCollected, financials.prizePool, 1), color: 'bg-yellow-400' },
                    ].map(bar => (
                      <div key={bar.label} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[9px] font-black text-black">₹{bar.value?.toLocaleString()}</span>
                        <div className="w-full bg-black/5 rounded-t-lg overflow-hidden" style={{ height: '64px' }}>
                          <div
                            className={`w-full rounded-t-lg transition-all duration-700 ${bar.color}`}
                            style={{ height: `${Math.max(4, (bar.value / bar.max) * 64)}px`, marginTop: `${64 - Math.max(4, (bar.value / bar.max) * 64)}px` }}
                          />
                        </div>
                        <span className="text-[9px] text-slate-400 font-bold">{bar.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 bg-white border border-black/8 rounded-2xl">
                <DollarSign size={36} className="text-slate-300 mx-auto mb-3" />
                <p className="font-black text-slate-400 text-sm">No financial data available</p>
                <button onClick={fetchFinancials} className="mt-3 bg-black text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest">Refresh</button>
              </div>
            )}
          </div>
        )}

        {/* Export Tab */}
        {activeTab === 'export' && (
          <div className="space-y-3">
            <div className="bg-white border border-black/8 rounded-2xl p-5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Export Reports</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { key: 'points-table', label: 'Points Table', desc: 'Team standings, NRR, W/L', icon: BarChart3, color: 'bg-emerald-100 text-emerald-600' },
                  { key: 'match-results', label: 'Match Results', desc: 'All match scores and outcomes', icon: Target, color: 'bg-sky-100 text-sky-600' },
                  { key: 'player-stats', label: 'Player Stats', desc: 'Individual batting & bowling stats', icon: TrendingUp, color: 'bg-violet-100 text-violet-600' },
                ].map(exp => (
                  <button
                    key={exp.key}
                    onClick={() => handleExport(exp.key)}
                    className="bg-black/3 hover:bg-black/6 border border-black/8 hover:border-black/15 rounded-2xl p-5 text-left transition-all group"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${exp.color}`}>
                      <exp.icon size={18} />
                    </div>
                    <p className="font-black text-sm text-black">{exp.label}</p>
                    <p className="text-[10px] text-slate-400 mt-1 font-bold">{exp.desc}</p>
                    <div className="flex items-center gap-1 mt-3 text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-black transition-colors">
                      <Download size={11} />
                      Download CSV
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="text-xs font-black text-amber-700 mb-1">💡 Export Tips</p>
              <ul className="text-[10px] text-amber-600 font-bold space-y-1">
                <li>• CSV files open in Excel, Google Sheets, or Numbers</li>
                <li>• Player stats require at least one completed match</li>
                <li>• NRR is calculated per ICC regulations</li>
              </ul>
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

const TeamRow = ({ rt, approved, onApprove, onReject, onMarkPaid, entryFee = 0 }) => {
  const team = rt.team_id;
  const name = team?.name || `Team ${rt.team_id?.toString?.()?.slice(-4) || '?'}`;
  const logo = team?.logo;
  const teamId = team?._id || rt.team_id;
  const isPaid = rt.paymentStatus === 'paid';

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
            isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-600'
          }`}>
            {rt.paymentStatus || 'Pending'}
          </span>
        </div>
      </div>
      <div className="flex gap-2 items-center">
        {!approved && (
          <>
            <button
              onClick={() => onApprove(teamId)}
              className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-400 text-black font-black px-3 py-2 rounded-xl text-[10px] uppercase tracking-widest"
            >
              <CheckCircle2 size={13} />Approve
            </button>
            <button
              onClick={() => onReject(teamId)}
              className="bg-red-50 hover:bg-red-100 text-red-500 font-black px-3 py-2 rounded-xl text-[10px]"
            >
              <XCircle size={13} />
            </button>
          </>
        )}
        {entryFee > 0 && !isPaid && (
          <button
            onClick={() => onMarkPaid?.(teamId)}
            className="flex items-center gap-1 bg-violet-100 hover:bg-violet-200 text-violet-700 font-black px-3 py-2 rounded-xl text-[10px] uppercase tracking-widest"
            title="Mark entry fee as paid (cash received)"
          >
            <DollarSign size={12} />Mark Paid
          </button>
        )}
        {approved && isPaid && <CheckCircle2 size={18} className="text-emerald-500" />}
        {approved && !isPaid && entryFee === 0 && <CheckCircle2 size={18} className="text-emerald-500" />}
      </div>
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

// ── SHARED PREMIUM QR MODAL FOR ADMIN ─────────────────────────────────
const QRModal = ({ isOpen, onClose, title, qrCodeImage, code, downloadFileName }) => {
  if (!isOpen) return null;

  const themeColor = '#3b82f6';
  const shadowColor = 'rgba(59,130,246,0.2)';

  const handleDownload = () => {
    if (!qrCodeImage) return;
    const link = document.createElement('a');
    link.href = qrCodeImage;
    link.download = downloadFileName || `qr_code_${code}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR Code download started!');
  };

  const handlePrint = () => {
    if (!qrCodeImage) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR Code - \${title}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              font-family: sans-serif;
            }
            img {
              width: 300px;
              height: 300px;
              margin-bottom: 20px;
            }
            h1 {
              font-size: 24px;
              margin: 0;
              text-transform: uppercase;
              letter-spacing: -0.02em;
            }
            p {
              font-size: 14px;
              color: #666;
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <img src="\${qrCodeImage}" />
          <h1>\${title}</h1>
          <p>Scan to view match details and live score</p>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div 
        className="relative bg-[#0d1527] border border-white/10 rounded-3xl max-w-sm w-full p-6 text-center text-white shadow-2xl transition-all scale-100"
        style={{ boxShadow: `0 20px 40px -15px \${shadowColor}` }}
      >
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full w-8 h-8 flex items-center justify-center transition-colors text-lg font-bold"
        >
          &times;
        </button>

        {/* Modal Title */}
        <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: themeColor }}>
          Match Scoring QR
        </p>
        <h3 className="text-xl font-black text-white uppercase tracking-tight mb-5 px-4 truncate">{title}</h3>

        {/* QR Code Container */}
        <div className="relative bg-white p-5 rounded-2xl inline-block mx-auto mb-5 shadow-inner border border-white/5">
          {qrCodeImage ? (
            <img 
              src={qrCodeImage} 
              alt={title} 
              className="w-48 h-48 mx-auto object-contain"
            />
          ) : (
            <div className="w-48 h-48 flex items-center justify-center text-slate-400 bg-slate-900 rounded-xl">
              <QrCode size={40} className="animate-pulse" />
            </div>
          )}
        </div>

        {/* Code Info Badge */}
        <div className="bg-white/5 border border-white/10 rounded-xl py-2 px-4 inline-flex items-center gap-2 mb-6">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Code:</span>
          <span className="text-sm font-black tracking-widest" style={{ color: themeColor }}>{code}</span>
        </div>

        {/* Google Lens instructions */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left mb-6">
          <div className="flex items-start gap-3">
            <Info size={16} className="mt-0.5 flex-shrink-0" style={{ color: themeColor }} />
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">Spectator Instruction</p>
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                Scan this code with <strong className="text-white">Google Lens</strong> or your phone's camera to instantly open the live ball-by-ball scorecard.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            disabled={!qrCodeImage}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-500 hover:bg-blue-400 text-white font-black rounded-2xl uppercase tracking-widest text-xs transition-all shadow-lg active:scale-[0.98]"
          >
            <Download size={14} /> Download
          </button>
          <button
            onClick={handlePrint}
            disabled={!qrCodeImage}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-black rounded-2xl uppercase tracking-widest text-xs transition-all shadow-lg active:scale-[0.98]"
          >
            Print
          </button>
        </div>
      </div>
    </div>
  );
};

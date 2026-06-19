import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Trophy, Users, Calendar, Shield, CheckCircle2, ChevronLeft,
  AlertCircle, Phone, Zap, Star, DollarSign, Clock, MapPin, Plus
} from 'lucide-react';
import apiClient from '../../api/client';
import { toast } from 'react-toastify';
import AuthContext from '../../context/AuthContext';

export default function TournamentRegister() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [tournament, setTournament] = useState(null);
  const [myTeams, setMyTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [eligibilityChecking, setEligibilityChecking] = useState(false);
  const [eligibilityConflicts, setEligibilityConflicts] = useState([]);

  useEffect(() => {
    if (selectedTeam) {
      checkTeamEligibility(selectedTeam._id);
    } else {
      setEligibilityConflicts([]);
    }
  }, [selectedTeam]);

  const checkTeamEligibility = async (teamId) => {
    try {
      setEligibilityChecking(true);
      const res = await apiClient.get(`/tournaments/${id}/check-player-eligibility?teamId=${teamId}`);
      if (res.data.success) {
        setEligibilityConflicts(res.data.conflicts || []);
      }
    } catch (err) {
      console.error('Eligibility check error:', err);
    } finally {
      setEligibilityChecking(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tRes, teamsRes] = await Promise.all([
        apiClient.get(`/tournaments/${id}`),
        apiClient.get('/teams')
      ]);
      setTournament(tRes.data.tournament);

      // Filter teams where current user is captain or creator
      const allTeams = teamsRes.data.teams || [];
      const myFilteredTeams = allTeams.filter(t =>
        t.captain?._id === user?._id ||
        t.captain === user?._id ||
        t.createdBy === user?._id
      );
      setMyTeams(myFilteredTeams.length > 0 ? myFilteredTeams : allTeams.slice(0, 5));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load tournament info');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!selectedTeam) {
      toast.error('Please select a team to register');
      return;
    }
    const memberCount = selectedTeam.players?.length || 0;
    if (memberCount < 7 || memberCount > 11) {
      toast.error(`Team size must be between 7 and 11 members. Current team size is ${memberCount} players.`);
      return;
    }
    if (!agreed) {
      toast.error('Please agree to the terms and rules');
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiClient.post(`/tournaments/${id}/register-team`, {
        teamId: selectedTeam._id
      });
      if (res.data.success) {
        if (tournament.entryFee > 0) {
          toast.success('Registration submitted! Redirecting to payment...');
          navigate(`/tournaments/${id}/payment?teamId=${selectedTeam._id}`);
        } else {
          toast.success('🎉 Registration submitted! Awaiting approval from the organizer.');
          navigate(`/tournaments/${id}`);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  const isAlreadyRegistered = (teamId) => {
    return tournament?.registeredTeams?.some(rt => rt.team_id?.toString() === teamId?.toString() ||
      rt.team_id?._id?.toString() === teamId?.toString());
  };

  const spotsLeft = tournament
    ? tournament.totalTeams - (tournament.registeredTeams?.filter(t => t.approvalStatus !== 'rejected').length || 0)
    : 0;

  if (loading) return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
      <div className="text-center">
        <div className="w-14 h-14 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading Tournament...</p>
      </div>
    </div>
  );

  if (!tournament) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <AlertCircle size={48} className="text-slate-300 mx-auto mb-4" />
        <p className="font-black text-slate-400">Tournament not found</p>
        <Link to="/tournaments" className="mt-4 inline-block text-emerald-600 font-black text-sm underline">
          Back to Tournaments
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white py-12 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-10 w-64 h-64 bg-emerald-400 rounded-full blur-[80px]" />
          <div className="absolute bottom-0 left-20 w-48 h-48 bg-teal-400 rounded-full blur-[60px]" />
        </div>
        <div className="max-w-3xl mx-auto relative">
          <Link to={`/tournaments/${id}`} className="flex items-center gap-2 text-white/40 hover:text-white text-xs font-black uppercase tracking-widest mb-6 transition-colors w-fit">
            <ChevronLeft size={14} />
            Back to Tournament
          </Link>

          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center border border-white/20">
              <Trophy size={30} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-1">Team Registration</p>
              <h1 className="text-2xl font-black uppercase tracking-tight text-white">{tournament.name}</h1>
              <p className="text-white/40 text-xs font-bold mt-1">
                {tournament.matchFormat} · {tournament.tournamentType?.replace('_', ' ')} · {spotsLeft} spots left
              </p>
            </div>
          </div>

          {/* Tournament Quick Info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
            {[
              { icon: Users, label: 'Teams', value: `${tournament.registeredTeams?.filter(t => t.approvalStatus !== 'rejected').length || 0}/${tournament.totalTeams}` },
              { icon: DollarSign, label: 'Entry Fee', value: tournament.entryFee > 0 ? `₹${tournament.entryFee}` : 'Free' },
              { icon: Calendar, label: 'Starts', value: tournament.startDate ? new Date(tournament.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'TBA' },
              { icon: Trophy, label: 'Prize Pool', value: tournament.prizePool > 0 ? `₹${tournament.prizePool}` : 'TBA' },
            ].map(item => (
              <div key={item.label} className="bg-white/10 backdrop-blur border border-white/10 rounded-2xl p-4">
                <item.icon size={14} className="text-emerald-400 mb-2" />
                <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">{item.label}</p>
                <p className="text-sm font-black text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Status Check */}
        {tournament.status !== 'registration' && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 flex items-start gap-3">
            <AlertCircle size={20} className="text-orange-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-orange-700 text-sm">Registration Not Open</p>
              <p className="text-xs text-orange-600 mt-1 font-bold">
                This tournament's status is <strong className="uppercase">{tournament.status}</strong>. 
                Registration is only available when the status is "Registration Open".
              </p>
            </div>
          </div>
        )}

        {spotsLeft <= 0 && tournament.status === 'registration' && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-red-700 text-sm">Tournament Full</p>
              <p className="text-xs text-red-600 mt-1 font-bold">All {tournament.totalTeams} slots have been filled.</p>
            </div>
          </div>
        )}

        {/* Select Team */}
        <div className="bg-white border border-black/8 rounded-2xl p-6">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Select Your Team</p>
          <p className="text-xs text-slate-500 mb-5 font-bold">Choose the team you want to register for this tournament.</p>

          {myTeams.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl">
              <Shield size={40} className="text-slate-300 mx-auto mb-3" />
              <p className="font-black text-slate-400 text-sm">You don't have a team yet</p>
              <p className="text-slate-300 text-xs mt-1 mb-5">Create a team to register for tournaments</p>
              <Link
                to={`/tournaments/${id}/teams/create`}
                className="inline-flex items-center gap-2 bg-emerald-500 text-black font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-widest"
              >
                <Plus size={14} />
                Create Team
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {myTeams.map(team => {
                const alreadyReg = isAlreadyRegistered(team._id);
                const isSelected = selectedTeam?._id === team._id;
                return (
                  <button
                    key={team._id}
                    disabled={alreadyReg}
                    onClick={() => !alreadyReg && setSelectedTeam(team)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                      alreadyReg
                        ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                        : isSelected
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-black/8 hover:border-emerald-300 hover:bg-emerald-50/30'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg border ${
                      isSelected ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {team.logo ? (
                        <img src={team.logo} alt={team.name} className="w-full h-full rounded-xl object-cover" />
                      ) : (
                        team.shortName?.[0] || team.name?.[0] || '?'
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`font-black text-sm ${isSelected ? 'text-emerald-800' : 'text-black'}`}>{team.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                        {team.city || 'City TBA'} · {team.players?.length || 0} players · {team.teamCode}
                      </p>
                    </div>
                    {alreadyReg && (
                      <span className="text-[9px] font-black text-orange-600 bg-orange-50 border border-orange-200 px-3 py-1 rounded-full uppercase tracking-widest">
                        Registered
                      </span>
                    )}
                    {isSelected && !alreadyReg && (
                      <CheckCircle2 size={22} className="text-emerald-500 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Team Info */}
        {selectedTeam && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3">Selected Team</p>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white font-black text-xl">
                {selectedTeam.name?.[0] || '?'}
              </div>
              <div>
                <p className="font-black text-emerald-900 text-base">{selectedTeam.name}</p>
                <p className="text-xs text-emerald-700 font-bold">
                  {selectedTeam.players?.length || 0} players · {selectedTeam.city || 'N/A'} · {selectedTeam.teamCode}
                </p>
              </div>
            </div>

            {(selectedTeam.players?.length < 7 || selectedTeam.players?.length > 11) && (
              <div className="mt-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-3">
                <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] font-bold text-red-700">
                  Tournament rules require team size to be between 7 and 11 members. 
                  Your selected team currently has {selectedTeam.players?.length || 0} members. 
                  Please update your team squad before registering.
                </p>
              </div>
            )}

            {eligibilityChecking && (
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 font-bold bg-slate-100 border border-slate-200 rounded-xl p-3">
                <div className="w-4 h-4 border-2 border-slate-300 border-t-emerald-500 rounded-full animate-spin" />
                <span>Checking player eligibility constraints...</span>
              </div>
            )}

            {!eligibilityChecking && eligibilityConflicts.length > 0 && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-start gap-2.5">
                  <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black text-red-700 text-xs uppercase tracking-wider">Player Registration Conflict</p>
                    <p className="text-[11px] text-red-600 mt-0.5 font-bold">
                      A player can only join one team per tournament. The following players are already registered in other teams:
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5 pl-7">
                  {eligibilityConflicts.map((c, idx) => (
                    <div key={idx} className="text-xs font-bold text-red-800 flex items-center justify-between bg-white border border-red-100 rounded-lg px-3 py-1.5 shadow-sm">
                      <div className="flex flex-col">
                        <span>{c.name}</span>
                        {c.mobile && c.mobile !== 'N/A' && (
                          <span className="text-[10px] text-red-500 font-medium">{c.mobile}</span>
                        )}
                      </div>
                      <span className="text-[9px] uppercase tracking-widest text-red-600 bg-red-50 border border-red-200/80 px-2.5 py-0.5 rounded-full font-black flex-shrink-0">
                        In {c.teamName}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Rules & Entry Fee */}
        <div className="bg-white border border-black/8 rounded-2xl p-6">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Tournament Rules</p>
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[
              { label: 'Format', value: tournament.matchFormat },
              { label: 'Players per Team', value: `${tournament.rules?.playingXISize || 11} (XI)` },
              { label: 'Max Squad Size', value: tournament.rules?.maxPlayersPerTeam || 25 },
              { label: 'Overs per Match', value: tournament.oversPerMatch },
              { label: 'Ball Type', value: tournament.ballType },
              { label: 'Entry Fee', value: tournament.entryFee > 0 ? `₹${tournament.entryFee}` : 'Free' },
            ].map(r => (
              <div key={r.label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{r.label}</p>
                <p className="font-black text-sm text-slate-900 mt-0.5 capitalize">{r.value}</p>
              </div>
            ))}
          </div>

          {tournament.description && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">About</p>
              <p className="text-xs text-slate-600 font-bold leading-relaxed">{tournament.description}</p>
            </div>
          )}
        </div>

        {/* Agreement & Submit */}
        <div className="bg-white border border-black/8 rounded-2xl p-6">
          <label className="flex items-start gap-4 cursor-pointer group">
            <div
              onClick={() => setAgreed(a => !a)}
              className={`mt-0.5 w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                agreed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 group-hover:border-emerald-400'
              }`}
            >
              {agreed && <CheckCircle2 size={14} className="text-white" strokeWidth={3} />}
            </div>
            <p className="text-xs text-slate-600 font-bold leading-relaxed">
              I confirm that all players in our team are eligible to participate and the information provided is accurate. 
              I agree to the tournament rules, code of conduct, and understand that registration is subject to organizer approval.
              {tournament.entryFee > 0 && ` Entry fee of ₹${tournament.entryFee} is payable upon approval.`}
            </p>
          </label>

          <button
            onClick={handleRegister}
            disabled={
              submitting || 
              !selectedTeam || 
              !agreed || 
              tournament.status !== 'registration' || 
              spotsLeft <= 0 ||
              eligibilityChecking ||
              eligibilityConflicts.length > 0 ||
              (selectedTeam.players?.length < 7 || selectedTeam.players?.length > 11)
            }
            className="w-full mt-6 flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black py-5 rounded-2xl text-sm uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/20 active:scale-[0.98]"
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Submitting Registration...
              </>
            ) : (
              <>
                <Trophy size={18} />
                Register Team for Tournament
              </>
            )}
          </button>

          <p className="text-[10px] text-center text-slate-400 font-bold mt-4 uppercase tracking-widest">
            Registration requires organizer approval · You'll be notified once approved
          </p>
        </div>
      </div>
    </div>
  );
}

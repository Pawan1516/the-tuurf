import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  QrCode, Users, MapPin, Shield, CheckCircle2, ArrowRight, Trophy,
  Zap, Star, Clock, Phone, User, Loader, ExternalLink, RefreshCw,
  Cpu, Sparkles, ChevronRight, UserPlus
} from 'lucide-react';
import apiClient from '../api/client';
import { toast } from 'react-toastify';
import AuthContext from '../context/AuthContext';

/* ─────────────────────────────────────────────────────────────────
   QR LANDING PAGE
   This page is the destination when someone scans a QR code with
   Google Lens. It handles both /join/team/:joinCode and
   /join/match/:matchCode routes.
   No authentication required to VIEW — but join requires login.
───────────────────────────────────────────────────────────────── */

export default function QRLandingPage() {
  const { joinCode, matchCode } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = React.useContext(AuthContext);

  const type = joinCode ? 'team' : 'match';
  const code = joinCode || matchCode;
  const tournamentId = searchParams.get('tid');

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [joined, setJoined] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [countdown, setCountdown] = useState(2);

  // Join form fields
  const [userName, setUserName] = useState('');
  const [userMobile, setUserMobile] = useState('');
  const [playerRole, setPlayerRole] = useState('All-rounder');

  // Auto-fill from logged-in user
  useEffect(() => {
    if (user) {
      setUserName(user.name || user.username || '');
      setUserMobile(user.phone || user.mobileNumber || '');
    } else {
      try {
        const stored = localStorage.getItem('user');
        if (stored) {
          const u = JSON.parse(stored);
          setUserName(u.name || u.username || '');
          setUserMobile(u.phone || '');
        }
      } catch (_) {}
    }
  }, [user]);

  // Fetch team/match info
  useEffect(() => {
    if (!code) return;
    if (type === 'team') fetchTeamInfo();
    else fetchMatchInfo();
  }, [code, type]);

  // Auto-redirect for match scans after 2 seconds
  useEffect(() => {
    if (type === 'match' && data && !loading && !error) {
      setCountdown(2);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            navigate(`/live/${data._id}`);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [type, data, loading, error, navigate]);

  const fetchTeamInfo = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get(`/teams/qr-info/${code}`);
      if (res.data.success) {
        setData(res.data.team);
        setAiMessage(res.data.aiMessage);
      } else {
        setError(res.data.message || 'Team not found');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'QR code not found or expired');
    } finally {
      setLoading(false);
    }
  };

  const fetchMatchInfo = async () => {
    setLoading(true);
    setError('');
    try {
      // Match QR: verify the match and redirect to live scoring
      const res = await apiClient.get(`/matches/by-code/${matchCode}`);
      if (res.data.success) {
        setData(res.data.match);
        setAiMessage(`🏏 Match ${res.data.match?.matchTitle || 'is live'}! Tap below to follow live.`);
      } else {
        setError(res.data.message || 'Match not found');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Match QR code not found');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!userName.trim()) return toast.error('Name is required');
    if (!userMobile.trim()) return toast.error('Mobile number is required');

    setSubmitting(true);
    try {
      const res = await apiClient.post(`/teams/${data._id}/request-join`, {
        joinCode: data.joinCode,
        userName,
        userMobile,
        role: playerRole
      });
      if (res.data.success) {
        setJoined(true);
        toast.success('🎉 Join request sent! The captain will review it.');
      } else {
        toast.error(res.data.message || 'Could not send request');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error sending join request');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Joined success state ──
  if (joined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-[#0a1a12] to-black flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center">
          <div className="w-24 h-24 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <CheckCircle2 size={48} className="text-emerald-400" />
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight mb-3">Request Sent! 🎉</h1>
          <p className="text-emerald-300/80 text-sm font-medium mb-2">
            Your join request for <strong className="text-white">{data?.name}</strong> has been transmitted.
          </p>
          <p className="text-slate-400 text-xs mb-8">The captain will review and approve your application.</p>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 text-left space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <User size={14} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">Applicant</p>
                <p className="text-sm font-black text-white">{userName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <Shield size={14} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">Role Applied</p>
                <p className="text-sm font-black text-white">{playerRole}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate(tournamentId ? `/tournaments/${tournamentId}` : '/tournaments')}
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-black py-3.5 rounded-xl uppercase tracking-widest text-xs transition-all"
            >
              View Tournament
            </button>
            <button
              onClick={() => { setJoined(false); setShowForm(false); }}
              className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 font-black py-3.5 rounded-xl uppercase tracking-widest text-xs transition-all"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-[#0a1a12] to-black flex items-center justify-center">
        <div className="text-center">
          <div className="relative mx-auto mb-6" style={{ width: 80, height: 80 }}>
            <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-transparent border-t-emerald-500 rounded-full animate-spin" />
            <QrCode size={28} className="absolute inset-0 m-auto text-emerald-400" />
          </div>
          <p className="text-emerald-400 font-black uppercase tracking-widest text-xs animate-pulse">Reading QR Code...</p>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-950 via-[#1a0a0a] to-black flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <QrCode size={36} className="text-rose-400" />
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-3">QR Code Error</h2>
          <p className="text-rose-300/80 text-sm mb-6">{error}</p>
          <button
            onClick={() => navigate('/tournaments')}
            className="bg-rose-500 hover:bg-rose-400 text-white font-black px-6 py-3 rounded-xl uppercase tracking-widest text-xs transition-all"
          >
            Browse Tournaments
          </button>
        </div>
      </div>
    );
  }

  // ── MATCH QR Landing ──
  if (type === 'match' && data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-[#0a0e1a] to-black flex items-center justify-center px-4">
        <div className="max-w-sm w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-blue-500/20 border border-blue-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy size={36} className="text-blue-400" />
            </div>
            <p className="text-blue-400/60 text-[10px] font-black uppercase tracking-[0.3em] mb-1">Match QR</p>
            <h1 className="text-2xl font-black text-white uppercase tracking-tight">{data.matchTitle || 'Live Match'}</h1>
          </div>

          {/* AI Message */}
          <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-2xl px-5 py-4 mb-6 shadow-inner">
            <div className="flex items-start gap-3">
              <Sparkles size={16} className="text-blue-400 mt-0.5 flex-shrink-0 animate-pulse" />
              <div>
                <p className="text-[10px] text-blue-400/60 uppercase tracking-widest font-black mb-1">AI Match Preview</p>
                <p className="text-blue-200 text-sm font-medium leading-relaxed">{aiMessage}</p>
              </div>
            </div>
          </div>

          {/* Countdown Indicator */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6 text-center shadow-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <RefreshCw size={14} className="text-blue-400 animate-spin" />
              <p className="text-slate-300 text-xs font-semibold">
                Redirecting to Live Score in <span className="text-blue-400 font-black text-sm">{countdown}</span>s...
              </p>
            </div>
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 to-indigo-400 h-full transition-all duration-1000 ease-linear"
                style={{ width: `${(countdown / 2) * 100}%` }}
              />
            </div>
          </div>

          <button
            onClick={() => navigate(`/live/${data._id}`)}
            className="w-full flex items-center justify-center gap-3 bg-blue-500 hover:bg-blue-400 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-sm transition-all shadow-lg shadow-blue-500/30 active:scale-[0.98]"
          >
            <Zap size={18} /> Follow Live Score
          </button>
        </div>
      </div>
    );
  }

  // ── TEAM QR Landing ──
  const teamColor = data?.primaryColor || '#10b981';

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-[#0a1a12] to-black flex items-center justify-center px-4 py-8">
      <div className="max-w-sm w-full">

        {/* Branding Header */}
        <div className="text-center mb-2">
          <Link to="/" className="inline-flex items-center gap-2 text-emerald-400/60 hover:text-emerald-400 transition-colors text-xs font-black uppercase tracking-widest mb-6">
            <span className="w-5 h-5 bg-emerald-500 rounded-md flex items-center justify-center text-white text-[8px]">T</span>
            The Turf
          </Link>
        </div>

        {/* Team Card */}
        <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden mb-4">
          {/* Gradient header bar */}
          <div className="h-2" style={{ background: `linear-gradient(90deg, ${teamColor}, ${teamColor}80)` }} />

          <div className="p-6">
            {/* Team identity */}
            <div className="flex items-center gap-4 mb-5">
              {data?.logo ? (
                <img src={data.logo} alt={data?.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-white/20" />
              ) : (
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl"
                  style={{ background: `linear-gradient(135deg, ${teamColor}, ${teamColor}80)` }}>
                  {data?.name?.[0] || 'T'}
                </div>
              )}
              <div>
                <p className="text-[10px] text-emerald-400/60 uppercase tracking-widest font-black mb-0.5">Team QR Join</p>
                <h1 className="text-xl font-black text-white uppercase tracking-tight leading-tight">{data?.name}</h1>
                {data?.city && (
                  <div className="flex items-center gap-1 mt-1">
                    <MapPin size={11} className="text-slate-400" />
                    <span className="text-slate-400 text-xs">{data.city}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              {[
                { label: 'Players', value: data?.playerCount || 0, icon: Users },
                { label: 'Wins', value: data?.stats?.wins || 0, icon: Trophy },
                { label: 'Win Rate', value: `${data?.winRate || 0}%`, icon: Star },
              ].map(stat => (
                <div key={stat.label} className="bg-white/5 rounded-xl p-2.5 text-center">
                  <stat.icon size={12} className="text-emerald-400 mx-auto mb-1" />
                  <p className="text-white font-black text-lg leading-none">{stat.value}</p>
                  <p className="text-slate-500 text-[9px] uppercase tracking-widest mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Captain */}
            {data?.captain && (
              <div className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5 mb-5">
                <Shield size={13} className="text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="text-[9px] text-slate-400 uppercase tracking-widest">Captain</p>
                  <p className="text-white font-black text-sm">{data.captain.name}</p>
                </div>
                {data?.spotsLeft > 0 && (
                  <div className="ml-auto">
                    <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest">
                      {data.spotsLeft} spots left
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* AI Message */}
            {aiMessage && (
              <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 mb-5">
                <div className="flex items-start gap-2">
                  <Cpu size={13} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                  <p className="text-emerald-200 text-xs font-medium leading-relaxed">{aiMessage}</p>
                </div>
              </div>
            )}

            {/* Join code badge */}
            <div className="flex items-center justify-between bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 mb-5">
              <div>
                <p className="text-[9px] text-slate-400 uppercase tracking-widest">Join Code</p>
                <p className="text-white font-black text-sm tracking-widest">{data?.joinCode}</p>
              </div>
              <QrCode size={18} className="text-emerald-400" />
            </div>

            {/* Capacity indicator */}
            {data?.playerCount !== undefined && (
              <div className="mb-5">
                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest mb-1.5">
                  <span className="text-slate-400">Squad Capacity</span>
                  <span className="text-emerald-400">{data.playerCount}/25</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${(data.playerCount / 25) * 100}%`,
                      background: `linear-gradient(90deg, ${teamColor}, ${teamColor}80)`
                    }}
                  />
                </div>
              </div>
            )}

            {/* Join Button / Form */}
            {!showForm ? (
              <div className="space-y-3">
                {user ? (
                  <button
                    onClick={() => setShowForm(true)}
                    disabled={data?.spotsLeft === 0}
                    className="w-full flex items-center justify-center gap-2 font-black py-4 rounded-2xl uppercase tracking-widest text-sm transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: data?.spotsLeft === 0
                        ? 'rgba(255,255,255,0.05)'
                        : `linear-gradient(135deg, ${teamColor}, ${teamColor}cc)`,
                      color: data?.spotsLeft === 0 ? '#64748b' : '#000'
                    }}
                  >
                    <UserPlus size={18} />
                    {data?.spotsLeft === 0 ? 'Team is Full' : 'Request to Join Squad'}
                  </button>
                ) : (
                  <>
                    <Link
                      to={`/login?redirect=/join/team/${code}${tournamentId ? `?tid=${tournamentId}` : ''}`}
                      className="w-full flex items-center justify-center gap-2 text-black font-black py-4 rounded-2xl uppercase tracking-widest text-sm transition-all shadow-lg"
                      style={{ background: `linear-gradient(135deg, ${teamColor}, ${teamColor}cc)` }}
                    >
                      <UserPlus size={18} /> Login to Join
                    </Link>
                    <Link
                      to={`/register?redirect=/join/team/${code}${tournamentId ? `?tid=${tournamentId}` : ''}`}
                      className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white font-black py-3.5 rounded-2xl uppercase tracking-widest text-xs transition-all border border-white/10"
                    >
                      <User size={15} /> Create Account
                    </Link>
                  </>
                )}

                <Link
                  to={tournamentId ? `/tournaments/${tournamentId}` : '/tournaments'}
                  className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-white font-bold text-xs py-2 transition-all"
                >
                  View Tournament <ChevronRight size={13} />
                </Link>
              </div>
            ) : (
              /* Join Form */
              <form onSubmit={handleJoin} className="space-y-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Full Name</label>
                  <input
                    type="text"
                    placeholder="Your full name"
                    value={userName}
                    onChange={e => setUserName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 focus:border-emerald-500 rounded-xl px-4 py-3 text-sm font-bold text-white placeholder-slate-500 outline-none transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Mobile Number</label>
                  <div className="relative">
                    <Phone size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      placeholder="10-digit mobile number"
                      value={userMobile}
                      onChange={e => setUserMobile(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-white placeholder-slate-500 outline-none transition-colors"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Playing Role</label>
                  <select
                    value={playerRole}
                    onChange={e => setPlayerRole(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 focus:border-emerald-500 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none transition-colors"
                  >
                    <option value="All-rounder" className="bg-gray-900">All-rounder</option>
                    <option value="Batsman" className="bg-gray-900">Batsman</option>
                    <option value="Bowler" className="bg-gray-900">Bowler</option>
                    <option value="Wicketkeeper" className="bg-gray-900">Wicketkeeper</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-2 text-black font-black py-4 rounded-2xl uppercase tracking-widest text-xs transition-all shadow-lg disabled:opacity-60"
                    style={{ background: submitting ? 'rgba(255,255,255,0.1)' : `linear-gradient(135deg, ${teamColor}, ${teamColor}cc)` }}
                  >
                    {submitting ? (
                      <><Loader size={14} className="animate-spin" /> Sending...</>
                    ) : (
                      <><CheckCircle2 size={14} /> Send Request</>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="bg-white/5 hover:bg-white/10 text-slate-400 font-black px-4 py-4 rounded-2xl uppercase tracking-widest text-xs transition-all"
                  >
                    Back
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Footer branding */}
        <div className="text-center">
          <p className="text-slate-600 text-[10px] uppercase tracking-widest font-bold">
            Powered by The Turf AI Platform
          </p>
        </div>
      </div>
    </div>
  );
}

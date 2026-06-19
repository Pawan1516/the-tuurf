import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Trophy, Users, Calendar, MapPin, TrendingUp, User, Shield,
  Award, ChevronRight, Share2, Clipboard, CheckCircle,
  Activity, ArrowLeft, Phone, UserPlus, Info, Zap,
  QrCode, Trash2, Download, AlertTriangle, X, Loader2
} from 'lucide-react';
import apiClient from '../api/client';
import AuthContext from '../context/AuthContext';
import { toast } from 'react-toastify';

const TeamProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);

    const [team, setTeam] = useState(null);
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('squad');
    const [inviteCopied, setInviteCopied] = useState(false);

    // Add player form
    const [newPlayerIdentifier, setNewPlayerIdentifier] = useState('');
    const [newPlayerRole, setNewPlayerRole] = useState('All-rounder');
    const [inviting, setInviting] = useState(false);

    // QR panel
    const [qrData, setQrData] = useState(null);
    const [qrLoading, setQrLoading] = useState(false);
    const [showQR, setShowQR] = useState(false);

    // Confirm delete modal
    const [confirmDelete, setConfirmDelete] = useState({
        open: false, type: null, playerId: null, playerName: ''
    });
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (id) {
            fetchTeamDetails();
            fetchTeamMatches();
        }
    }, [id]);

    const fetchTeamDetails = async () => {
        try {
            setLoading(true);
            const res = await apiClient.get(`/teams/${id}`);
            if (res.data && res.data.success) {
                setTeam(res.data.team);
            } else {
                toast.error('Failed to retrieve team details.');
            }
        } catch (err) {
            console.error('Team Sync Failure:', err);
            toast.error('Error synchronizing team node.');
        } finally {
            setLoading(false);
        }
    };

    const fetchTeamMatches = async () => {
        try {
            const res = await apiClient.get('/matches/live');
            if (res.data && res.data.success) {
                const teamMatches = res.data.matches.filter(m => {
                    const teamAId = m.team_a?.team_id?._id || m.team_a?.team_id;
                    const teamBId = m.team_b?.team_id?._id || m.team_b?.team_id;
                    return teamAId === id || teamBId === id;
                });
                setMatches(teamMatches);
            }
        } catch (err) {
            console.error('Match Fetch Failure:', err);
        }
    };

    const fetchQRCode = async () => {
        setQrLoading(true);
        try {
            const res = await apiClient.get(`/teams/${id}/qr-code`);
            if (res.data.success) {
                setQrData(res.data);
                setShowQR(true);
            } else {
                toast.error(res.data.message || 'Failed to load QR code');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not load QR code');
        } finally {
            setQrLoading(false);
        }
    };

    const copyInviteLink = () => {
        if (!team?.invite?.code) return;
        const joinLink = `${window.location.origin}/join/team/${team.invite.code}`;
        navigator.clipboard.writeText(joinLink);
        setInviteCopied(true);
        toast.success('Secure Invitation Link Copied!');
        setTimeout(() => setInviteCopied(false), 3000);
    };

    const handleAddPlayer = async (e) => {
        e.preventDefault();
        if (!newPlayerIdentifier.trim()) {
            toast.warn('Please enter a player mobile number or username.');
            return;
        }
        setInviting(true);
        try {
            const res = await apiClient.post(`/teams/${id}/add-by-mobile`, {
                mobile: newPlayerIdentifier.trim(),
                role: newPlayerRole
            });
            if (res.data && res.data.success) {
                toast.success(res.data.message || 'Player invite dispatched!');
                setNewPlayerIdentifier('');
                fetchTeamDetails();
            } else {
                toast.error(res.data.message || 'Failed to dispatch player invite.');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Registry synchronization failure.');
        } finally {
            setInviting(false);
        }
    };

    const handleRemovePlayer = async () => {
        if (!confirmDelete.playerId) return;
        setDeleting(true);
        try {
            const role = (user?.role || '').toUpperCase();
            const endpoint = role === 'ADMIN'
                ? `/teams/admin/${id}/players/${confirmDelete.playerId}`
                : `/teams/${id}/players/remove/${confirmDelete.playerId}`;
            const res = await apiClient.delete(endpoint);
            if (res.data.success) {
                toast.success(res.data.message);
                fetchTeamDetails();
            } else {
                toast.error(res.data.message);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Remove failed');
        } finally {
            setDeleting(false);
            setConfirmDelete({ open: false, type: null, playerId: null, playerName: '' });
        }
    };

    const handleDeleteTeam = async () => {
        setDeleting(true);
        try {
            const res = await apiClient.delete(`/teams/admin/${id}`);
            if (res.data.success) {
                toast.success(res.data.message);
                navigate('/admin/teams');
            } else {
                toast.error(res.data.message);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Delete failed');
        } finally {
            setDeleting(false);
            setConfirmDelete({ open: false, type: null, playerId: null, playerName: '' });
        }
    };

    // ── Loading State ──
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none opacity-20">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px] animate-pulse" />
                </div>
                <div className="relative flex flex-col items-center space-y-4">
                    <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                    <p className="text-xs font-black text-emerald-500 uppercase tracking-[0.3em] animate-pulse">Syncing Team Registry...</p>
                </div>
            </div>
        );
    }

    // ── Not Found ──
    if (!team) {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
                <div className="max-w-md space-y-6">
                    <div className="inline-flex bg-red-500/10 p-6 rounded-3xl border border-red-500/20 text-red-500 mb-2">
                        <Shield size={48} />
                    </div>
                    <h1 className="text-3xl font-black uppercase italic tracking-tighter text-slate-100">Team Profile Missing</h1>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider leading-relaxed">
                        The requested team node does not exist or has been purged from the registry.
                    </p>
                    <button
                        onClick={() => navigate('/')}
                        className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl shadow-emerald-600/20"
                    >
                        Return to Base
                    </button>
                </div>
            </div>
        );
    }

    const teamMembersList = team.members || team.players || [];
    const captainData = team.captain_id || team.captain;

    // Access rights
    const isAdmin = (user?.role || '').toUpperCase() === 'ADMIN';
    const isLeader = user && (
        team.leader_id === user.id || team.leader_id === user._id ||
        captainData?._id === user.id || captainData?._id === user._id ||
        team.createdBy?.toString() === user.id || team.createdBy?.toString() === user._id
    );
    const canManage = isLeader || isAdmin;

    const totalWins = team.stats?.wins || 0;
    const totalLosses = team.stats?.losses || 0;
    const totalMatches = team.stats?.matches || totalWins + totalLosses || 0;
    const winRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;
    const titlesCount = team.stats?.titles || 0;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 relative overflow-hidden font-sans">
            {/* Ambient Lighting */}
            <div className="absolute inset-0 pointer-events-none opacity-20">
                <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-emerald-500/10 rounded-full blur-[140px] animate-pulse" />
                <div className="absolute top-[40%] right-[-10%] w-[80%] h-[80%] bg-indigo-500/10 rounded-full blur-[140px]" />
            </div>

            {/* Back Navigation */}
            <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 relative z-10">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                >
                    <ArrowLeft size={14} /> Back
                </button>
            </div>

            <div className="max-w-7xl mx-auto px-4 md:px-8 mt-6 relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* ─── LEFT COLUMN ─── */}
                <div className="lg:col-span-1 space-y-6">

                    {/* Team Main Info Card */}
                    <div className="bg-slate-900/80 backdrop-blur-2xl rounded-[3rem] border border-white/10 p-8 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 to-indigo-500" />
                        <div className="absolute -top-10 -right-10 w-36 h-36 bg-emerald-500/10 rounded-full blur-[60px] group-hover:bg-emerald-500/20 transition-all duration-700" />

                        <div className="flex flex-col items-center text-center mt-4">
                            {/* Logo */}
                            <div className="relative mb-6">
                                <div className="absolute inset-0 bg-emerald-500 rounded-[2rem] blur-xl opacity-20 animate-pulse" />
                                {team.logo ? (
                                    <img
                                        src={team.logo}
                                        alt={team.name}
                                        className="w-28 h-28 object-cover rounded-[2rem] border-2 border-emerald-500 relative z-10 shadow-2xl"
                                        onError={e => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1540747737956-378724044592?q=80&w=200&auto=format&fit=crop'; }}
                                    />
                                ) : (
                                    <div className="w-28 h-28 bg-gradient-to-tr from-emerald-600 to-indigo-700 rounded-[2rem] flex items-center justify-center border-2 border-emerald-500/40 relative z-10 shadow-2xl">
                                        <Trophy size={48} className="text-white" />
                                    </div>
                                )}
                                <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-slate-950 p-2 rounded-full z-20 shadow-lg border-2 border-slate-900">
                                    <Shield size={14} className="fill-slate-950" />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <h1 className="text-3xl font-black uppercase italic tracking-tighter text-slate-100">{team.name}</h1>
                                <span className="inline-block px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    {team.short_name || team.shortName || 'TMA'}
                                </span>
                            </div>

                            <div className="mt-8 w-full border-t border-white/5 pt-6 space-y-4">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5"><User size={13} className="text-emerald-500" /> Captain</span>
                                    <span className="font-black text-slate-200">{captainData?.name || 'Unassigned'}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5"><MapPin size={13} className="text-indigo-400" /> City</span>
                                    <span className="font-black text-slate-200">{team.city || 'N/A'}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5"><Calendar size={13} className="text-emerald-500" /> Registry Date</span>
                                    <span className="font-black text-slate-200">{team.createdAt ? new Date(team.createdAt).toLocaleDateString() : 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Box */}
                    <div className="bg-slate-900/80 backdrop-blur-2xl rounded-[3rem] border border-white/10 p-8 shadow-2xl relative overflow-hidden">
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                            <TrendingUp size={16} className="text-emerald-500" /> Performance
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { label: 'Matches', value: totalMatches },
                                { label: 'Win Rate', value: `${winRate}%`, color: 'text-emerald-400' },
                                { label: 'Wins', value: totalWins },
                                { label: 'Losses', value: totalLosses },
                            ].map(s => (
                                <div key={s.label} className="bg-white/5 border border-white/10 p-5 rounded-2xl text-center">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                                    <p className={`text-3xl font-black ${s.color || 'text-slate-100'}`}>{s.value}</p>
                                </div>
                            ))}
                        </div>
                        {titlesCount > 0 && (
                            <div className="mt-4 bg-gradient-to-r from-emerald-500/10 to-indigo-500/10 border border-emerald-500/20 p-5 rounded-2xl flex items-center gap-4">
                                <div className="p-3 bg-emerald-500 rounded-xl text-slate-950"><Award size={20} /></div>
                                <div>
                                    <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Championships</p>
                                    <p className="text-base font-black text-slate-200">{titlesCount} Title{titlesCount > 1 ? 's' : ''}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Invite Code Panel */}
                    {team.invite?.code && (
                        <div className="bg-slate-900/80 backdrop-blur-2xl rounded-[3rem] border border-white/10 p-8 shadow-2xl">
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                                <Share2 size={16} className="text-indigo-400" /> Roster Pass
                            </h3>
                            <div className="bg-slate-950/80 border-2 border-white/5 rounded-2xl p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Roster Code</p>
                                    <p className="text-lg font-black text-emerald-500 tracking-[0.2em]">{team.invite.code}</p>
                                </div>
                                <button
                                    onClick={copyInviteLink}
                                    className="p-3 bg-white/5 hover:bg-emerald-500/10 border border-white/10 rounded-xl text-slate-400 hover:text-emerald-400 transition-all flex items-center gap-1.5"
                                >
                                    {inviteCopied ? <CheckCircle size={16} /> : <Clipboard size={16} />}
                                    <span className="text-[9px] font-black uppercase tracking-widest">Copy</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* QR Code Panel — owner only */}
                    {isLeader && (
                        <div className="bg-slate-900/80 backdrop-blur-2xl rounded-[3rem] border border-white/10 p-8 shadow-2xl">
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                                <QrCode size={16} className="text-emerald-400" /> Team QR Code
                            </h3>
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-4 leading-relaxed">
                                Share this QR for players to scan and join your team instantly.
                            </p>
                            {!showQR ? (
                                <button
                                    onClick={fetchQRCode}
                                    disabled={qrLoading}
                                    className="w-full h-12 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/20 rounded-2xl font-black uppercase text-xs tracking-widest text-emerald-400 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                >
                                    {qrLoading
                                        ? <><Loader2 size={14} className="animate-spin" /> Loading...</>
                                        : <><QrCode size={14} /> Show QR Code</>
                                    }
                                </button>
                            ) : qrData ? (
                                <div className="space-y-4">
                                    <div className="bg-white p-4 rounded-2xl flex items-center justify-center">
                                        <img src={qrData.qrCode} alt="Team QR" className="w-48 h-48 object-contain" />
                                    </div>
                                    <div className="bg-slate-950/80 border border-white/5 rounded-2xl p-3 text-center">
                                        <p className="text-[9px] text-slate-400 uppercase tracking-widest mb-0.5">Join URL</p>
                                        <p className="text-xs font-bold text-emerald-400 break-all">{qrData.joinUrl}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => { navigator.clipboard.writeText(qrData.joinUrl); toast.success('Join link copied!'); }}
                                            className="py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all flex items-center justify-center gap-1.5"
                                        >
                                            <Clipboard size={12} /> Copy Link
                                        </button>
                                        <a
                                            href={qrData.qrCode}
                                            download={`${team.name}-qr.png`}
                                            className="py-3 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-400 transition-all flex items-center justify-center gap-1.5"
                                        >
                                            <Download size={12} /> Download
                                        </a>
                                    </div>
                                    <button
                                        onClick={() => setShowQR(false)}
                                        className="w-full py-2.5 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors"
                                    >
                                        Hide QR
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    )}

                    {/* Admin Delete Team */}
                    {isAdmin && (
                        <div className="bg-red-500/5 border border-red-500/20 rounded-[3rem] p-6">
                            <h3 className="text-sm font-black uppercase tracking-widest text-red-400 mb-3 flex items-center gap-2">
                                <AlertTriangle size={16} /> Admin Controls
                            </h3>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-4">
                                Permanently remove this team from the system.
                            </p>
                            <button
                                onClick={() => setConfirmDelete({ open: true, type: 'team', playerId: null, playerName: '' })}
                                className="w-full py-3.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-2xl text-xs font-black uppercase tracking-widest text-red-400 flex items-center justify-center gap-2 transition-all"
                            >
                                <Trash2 size={13} /> Delete This Team
                            </button>
                        </div>
                    )}
                </div>

                {/* ─── RIGHT COLUMN ─── */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Tab Navigation */}
                    <div className="bg-slate-900/60 backdrop-blur-3xl rounded-[2rem] border border-white/10 p-2 flex gap-2">
                        {[
                            { id: 'squad', label: 'Team Roster', icon: Users },
                            { id: 'matches', label: 'Arena History', icon: Activity },
                            { id: 'invite', label: 'Deploy Invites', icon: UserPlus, hide: !isLeader },
                        ].map(t => {
                            if (t.hide) return null;
                            const active = activeTab === t.id;
                            return (
                                <button
                                    key={t.id}
                                    onClick={() => setActiveTab(t.id)}
                                    className={`flex-1 flex items-center justify-center gap-2.5 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${active
                                        ? 'bg-emerald-500 text-slate-950 shadow-xl shadow-emerald-500/10'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                                >
                                    <t.icon size={14} />
                                    {t.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Tab Content */}
                    <div className="transition-all duration-500">

                        {/* Squad Tab */}
                        {activeTab === 'squad' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-lg font-black uppercase italic tracking-tighter text-slate-200">Roster Squad</h3>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                                        {teamMembersList.length} Operator{teamMembersList.length !== 1 ? 's' : ''} Registered
                                    </span>
                                </div>

                                {teamMembersList.length === 0 ? (
                                    <div className="bg-slate-900/80 backdrop-blur-2xl rounded-[3rem] border border-white/10 p-12 text-center text-slate-400">
                                        <Info size={32} className="mx-auto mb-4 text-slate-500" />
                                        <p className="text-xs uppercase font-black tracking-wider">Roster is vacant</p>
                                        <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wide">Add squad players to commence official matchmaking.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {teamMembersList.map((m, idx) => {
                                            const uInfo = m.user_id || m;
                                            const role = m.role || uInfo.role || 'All-rounder';
                                            const isCaptain = captainData?._id === uInfo._id || captainData === uInfo._id || team.leader_id === uInfo._id;
                                            const pId = uInfo._id || uInfo.user_id;

                                            return (
                                                <div
                                                    key={idx}
                                                    className="bg-slate-900/80 backdrop-blur-2xl rounded-3xl border border-white/10 p-6 flex items-center justify-between group hover:border-emerald-500/30 hover:bg-slate-900 transition-all duration-300"
                                                >
                                                    <div className="flex items-center gap-4 min-w-0">
                                                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:border-emerald-500/20 group-hover:bg-emerald-500/5 transition-colors">
                                                            <User size={20} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="font-black text-sm text-slate-200 truncate uppercase tracking-tight flex items-center gap-2">
                                                                {uInfo.name || 'Walk-in Player'}
                                                                {isCaptain && (
                                                                    <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                                                                        Captain
                                                                    </span>
                                                                )}
                                                            </h4>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{role}</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        {/* Remove player — owner or admin */}
                                                        {canManage && pId && (
                                                            <button
                                                                onClick={() => setConfirmDelete({
                                                                    open: true,
                                                                    type: 'player',
                                                                    playerId: pId,
                                                                    playerName: uInfo.name || 'this player'
                                                                })}
                                                                title="Remove player"
                                                                className="p-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 rounded-xl text-red-400 hover:text-red-300 transition-all"
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        )}
                                                        <Link
                                                            to={`/matches/players/${uInfo._id || uInfo.user_id}`}
                                                            className="p-3 bg-white/5 hover:bg-emerald-50 text-slate-400 hover:text-slate-950 rounded-xl border border-white/10 hover:border-emerald-500 transition-all flex items-center justify-center"
                                                        >
                                                            <ChevronRight size={14} />
                                                        </Link>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Matches Tab */}
                        {activeTab === 'matches' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-lg font-black uppercase italic tracking-tighter text-slate-200">Arena Matches</h3>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                                        {matches.length} Scheduled/Completed
                                    </span>
                                </div>

                                {matches.length === 0 ? (
                                    <div className="bg-slate-900/80 backdrop-blur-2xl rounded-[3rem] border border-white/10 p-12 text-center text-slate-400">
                                        <Info size={32} className="mx-auto mb-4 text-slate-500" />
                                        <p className="text-xs uppercase font-black tracking-wider">No Matches Registered</p>
                                        <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wide">This team has no logged historical matches.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {matches.map((m, idx) => {
                                            const teamAName = m.team_a?.team_id?.name || m.team_a?.name || 'Team A';
                                            const teamBName = m.team_b?.team_id?.name || m.team_b?.name || 'Team B';
                                            const status = m.status || 'Scheduled';
                                            return (
                                                <div key={idx} className="bg-slate-900/80 backdrop-blur-2xl rounded-3xl border border-white/10 p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:border-emerald-500/20 transition-colors">
                                                    <div className="flex items-center justify-center gap-6 w-full md:w-auto">
                                                        <div className="text-center w-24">
                                                            <p className="font-black text-xs text-slate-200 truncate uppercase">{teamAName}</p>
                                                            <p className="text-lg font-black text-emerald-400 mt-1">{m.team_a?.score || 0}</p>
                                                        </div>
                                                        <div className="flex flex-col items-center">
                                                            <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-400">VS</span>
                                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">{m.format || '20 Overs'}</p>
                                                        </div>
                                                        <div className="text-center w-24">
                                                            <p className="font-black text-xs text-slate-200 truncate uppercase">{teamBName}</p>
                                                            <p className="text-lg font-black text-emerald-400 mt-1">{m.team_b?.score || 0}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between w-full md:w-auto md:justify-end gap-6 border-t md:border-t-0 border-white/5 pt-4 md:pt-0">
                                                        <div className="text-right">
                                                            <span className={`inline-block px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${status === 'In Progress' ? 'bg-amber-500/20 border border-amber-500/30 text-amber-400 animate-pulse' : status === 'Completed' ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400' : 'bg-white/5 border border-white/10 text-slate-400'}`}>
                                                                {status}
                                                            </span>
                                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                                {m.start_time ? new Date(m.start_time).toLocaleDateString() : 'Upcoming'}
                                                            </p>
                                                        </div>
                                                        <Link to={`/matches/${m._id}`} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-slate-950 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                                                            Scorecard
                                                        </Link>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Invite Tab */}
                        {activeTab === 'invite' && isLeader && (
                            <div className="bg-slate-900/80 backdrop-blur-2xl rounded-[3rem] border border-white/10 p-8 shadow-2xl space-y-6">
                                <div>
                                    <h3 className="text-lg font-black uppercase italic tracking-tighter text-slate-200 flex items-center gap-2">
                                        <UserPlus size={18} className="text-emerald-500" /> Dispatch Player Invite
                                    </h3>
                                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-1 leading-relaxed">
                                        Input user mobile ID or unique username to enlist new players into the team registry.
                                    </p>
                                </div>

                                <form onSubmit={handleAddPlayer} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="md:col-span-2 space-y-2">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Player Identifier</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="Mobile ID (e.g. 9876543210) or @username"
                                                className="w-full bg-slate-950 border border-white/10 focus:border-emerald-500/30 p-4 rounded-xl outline-none font-bold text-xs text-slate-200 placeholder:text-slate-600 focus:bg-slate-900 transition-all"
                                                value={newPlayerIdentifier}
                                                onChange={e => setNewPlayerIdentifier(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Match Role</label>
                                            <select
                                                className="w-full bg-slate-950 border border-white/10 focus:border-emerald-500/30 p-4 rounded-xl outline-none font-black text-xs text-slate-200 focus:bg-slate-900 transition-all uppercase tracking-wider"
                                                value={newPlayerRole}
                                                onChange={e => setNewPlayerRole(e.target.value)}
                                            >
                                                {['Batsman', 'Bowler', 'All-rounder', 'Wicket-keeper'].map(r => (
                                                    <option key={r} value={r} className="bg-slate-950 text-slate-200 uppercase">{r}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={inviting}
                                        className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-slate-950 hover:text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-2 transition-all disabled:opacity-20 shadow-xl shadow-emerald-500/10"
                                    >
                                        {inviting ? 'Dispatching...' : <span className="flex items-center gap-2">Enlist Player Into Roster <Zap size={14} /></span>}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Confirm Delete Modal ── */}
            {confirmDelete.open && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center px-4"
                    onClick={() => !deleting && setConfirmDelete(prev => ({ ...prev, open: false }))}
                >
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                    <div
                        className="relative bg-slate-900 border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={() => !deleting && setConfirmDelete(prev => ({ ...prev, open: false }))}
                            className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 transition-all"
                        >
                            <X size={14} />
                        </button>
                        <div className="w-14 h-14 bg-red-500/20 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto mb-5">
                            <AlertTriangle size={24} className="text-red-400" />
                        </div>
                        <h2 className="text-lg font-black uppercase tracking-tight text-center text-slate-100 mb-2">
                            {confirmDelete.type === 'team' ? 'Delete Team?' : 'Remove Player?'}
                        </h2>
                        <p className="text-center text-slate-400 text-sm mb-6">
                            {confirmDelete.type === 'team'
                                ? <span>Permanently delete <strong className="text-white">{team?.name}</strong> and all its data?</span>
                                : <span>Remove <strong className="text-white">{confirmDelete.playerName}</strong> from this squad?</span>
                            }
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => !deleting && setConfirmDelete(prev => ({ ...prev, open: false }))}
                                disabled={deleting}
                                className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-300 transition-all disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete.type === 'team' ? handleDeleteTeam : handleRemovePlayer}
                                disabled={deleting}
                                className="flex-1 py-3.5 bg-red-600 hover:bg-red-500 rounded-2xl text-xs font-black uppercase tracking-widest text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
                            >
                                {deleting
                                    ? <><Loader2 size={13} className="animate-spin" /> Working...</>
                                    : <><Trash2 size={13} /> Confirm</>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeamProfile;

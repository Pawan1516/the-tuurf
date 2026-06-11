import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Users, CheckCircle2, XCircle, Shield, Star, QrCode, Copy, Phone,
  UserPlus, Settings, Trophy, ChevronDown, Zap, AlertCircle, User,
  Search, Plus, Hash
} from 'lucide-react';
import apiClient from '../../api/client';
import { toast } from 'react-toastify';

const ROLES = ['Batsman', 'Bowler', 'All-rounder', 'Wicket-keeper'];

export default function TeamManagement() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('squad');
  const [copied, setCopied] = useState(false);

  // Add-by-Mobile state
  const [addMobile, setAddMobile] = useState('');
  const [addRole, setAddRole] = useState('All-rounder');
  const [addJersey, setAddJersey] = useState('');
  const [lookupUser, setLookupUser] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [addingPlayer, setAddingPlayer] = useState(false);

  useEffect(() => {
    fetchTeam();
    fetchRequests();
  }, [id]);

  const fetchTeam = async () => {
    try {
      const res = await apiClient.get(`/teams/${id}`);
      setTeam(res.data.team);
    } catch {
      toast.error('Failed to load team');
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await apiClient.get(`/teams/${id}/requests`);
      setRequests(res.data.requests || []);
    } catch {}
  };

  const approvePlayer = async (requestId, role = 'All-rounder') => {
    try {
      await apiClient.post(`/teams/${id}/approve-player`, { requestId, role });
      toast.success('Player approved! ✅');
      fetchTeam();
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve');
    }
  };

  const rejectPlayer = async (requestId) => {
    try {
      await apiClient.post(`/teams/${id}/reject-player`, { requestId });
      toast.success('Request rejected');
      fetchRequests();
    } catch {}
  };

  const updateRole = async (userId, role) => {
    try {
      await apiClient.put(`/teams/${id}/players/role`, { userId, role });
      toast.success('Role updated');
      fetchTeam();
    } catch {}
  };

  const copyJoinCode = () => {
    navigator.clipboard.writeText(team?.joinCode || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lookupByMobile = async (phone) => {
    const clean = phone.replace(/\D/g, '').replace(/^91/, '').slice(-10);
    if (clean.length !== 10) { setLookupUser(null); return; }
    setLookupLoading(true);
    try {
      const res = await apiClient.get(`/teams/lookup-mobile?phone=${clean}`);
      setLookupUser(res.data.user || null);
    } catch {
      setLookupUser(null);
    } finally {
      setLookupLoading(false);
    }
  };

  const addPlayerByMobile = async () => {
    if (!addMobile || addMobile.replace(/\D/g, '').length < 10) {
      toast.error('Enter a valid 10-digit mobile number');
      return;
    }
    setAddingPlayer(true);
    try {
      const res = await apiClient.post(`/teams/${id}/add-by-mobile`, {
        mobile: addMobile,
        role: addRole,
        jerseyNumber: addJersey ? parseInt(addJersey) : undefined
      });
      if (res.data.success) {
        toast.success(`${res.data.player?.name || 'Player'} added to squad! ✅`);
        setAddMobile('');
        setAddJersey('');
        setLookupUser(null);
        fetchTeam();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add player');
    } finally {
      setAddingPlayer(false);
    }
  };

  const removePlayer = async (userId) => {
    if (!window.confirm('Remove this player from the squad?')) return;
    try {
      await apiClient.delete(`/teams/${id}/players/${userId}`);
      toast.success('Player removed');
      fetchTeam();
    } catch {}
  };

  if (loading) return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );

  if (!team) return <div className="p-8 text-center text-slate-400">Team not found</div>;

  const squadCount = team.players?.length || 0;
  const pendingCount = requests.length;

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 to-emerald-950 text-white py-10 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start gap-5">
            {team.logo ? (
              <img src={team.logo} alt={team.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-white/20" />
            ) : (
              <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl flex items-center justify-center">
                <Shield size={28} className="text-emerald-400" />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-black uppercase tracking-tight text-white">{team.name}</h1>
              <div className="flex items-center gap-4 mt-1">
                {team.city && <span className="text-white/40 text-xs font-bold">{team.city}</span>}
                <span className="text-white/40 text-xs font-bold">{squadCount}/25 Players</span>
                <span className="text-white/40 text-xs font-bold">ID: {team.teamCode}</span>
              </div>
            </div>
            {pendingCount > 0 && (
              <div className="flex items-center gap-2 bg-orange-500/20 border border-orange-500/30 rounded-xl px-3 py-2">
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
                <span className="text-orange-300 text-xs font-black">{pendingCount} Pending</span>
              </div>
            )}
          </div>

          {/* Join Code */}
          <div className="mt-6 flex items-center gap-3 bg-white/10 rounded-2xl px-5 py-3 max-w-xs">
            <QrCode size={16} className="text-emerald-400" />
            <div className="flex-1">
              <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Join Code</p>
              <p className="text-sm font-black text-emerald-400">{team.joinCode}</p>
            </div>
            <button onClick={copyJoinCode} className={`transition-colors ${copied ? 'text-emerald-400' : 'text-white/40 hover:text-white'}`}>
              {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* QR Code section */}
      {team.qrCode && (
        <div className="bg-white border-b border-black/8 px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center gap-6">
            <img src={team.qrCode} alt="QR" className="w-20 h-20 rounded-xl border border-black/10" />
            <div>
              <p className="text-sm font-black text-black">Share QR to invite players</p>
              <p className="text-[10px] text-slate-400 font-bold mt-1">Players scan this to request joining your team</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Squad', value: squadCount, max: '/25', color: 'text-black' },
            { label: 'Pending', value: pendingCount, color: 'text-orange-600' },
            { label: 'Matches', value: team.stats?.matches || 0, color: 'text-black' },
            { label: 'Wins', value: team.stats?.wins || 0, color: 'text-emerald-600' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-black/8 rounded-2xl p-4 text-center">
              <p className={`text-2xl font-black ${s.color}`}>{s.value}{s.max || ''}</p>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'squad', label: `Squad (${squadCount})` },
            { id: 'requests', label: `Requests ${pendingCount > 0 ? `(${pendingCount})` : ''}` },
            { id: 'add', label: '+ Add Player' },
            { id: 'qr', label: 'QR & Codes' },
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

        {/* Squad Tab */}
        {activeTab === 'squad' && (
          <div className="space-y-3">
            {squadCount === 0 ? (
              <div className="text-center py-12 bg-white border border-black/8 rounded-2xl">
                <Users size={36} className="text-slate-300 mx-auto mb-3" />
                <p className="font-black text-slate-400 uppercase tracking-wide text-sm">Squad is empty</p>
                <p className="text-slate-300 text-xs mt-1">Share the QR code or Join Code to add players</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{squadCount} / 25 Players</p>
                </div>
                {team.players?.map((player, i) => (
                  <div key={i} className="bg-white border border-black/8 rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <User size={18} className="text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black text-black">{player.name}</p>
                        {team.captain?.toString() === player.user_id?.toString() && (
                          <span className="bg-yellow-100 text-yellow-700 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">C</span>
                        )}
                        {team.viceCaptain?.toString() === player.user_id?.toString() && (
                          <span className="bg-blue-100 text-blue-700 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">VC</span>
                        )}
                      </div>
                      {player.mobile && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Phone size={10} className="text-slate-400" />
                          <p className="text-[10px] text-slate-400 font-bold">{player.mobile}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={player.role}
                        onChange={e => updateRole(player.user_id?.toString(), e.target.value)}
                        className="bg-black/3 border border-black/10 rounded-xl px-2 py-1.5 text-[10px] font-black uppercase tracking-widest outline-none"
                      >
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <button
                        onClick={() => removePlayer(player.user_id?.toString())}
                        className="w-8 h-8 flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-colors"
                      >
                        <XCircle size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <div className="space-y-3">
            {requests.length === 0 ? (
              <div className="text-center py-12 bg-white border border-black/8 rounded-2xl">
                <UserPlus size={36} className="text-slate-300 mx-auto mb-3" />
                <p className="font-black text-slate-400 uppercase tracking-wide text-sm">No pending requests</p>
                <p className="text-slate-300 text-xs mt-1">Players will appear here when they scan your QR</p>
              </div>
            ) : requests.map((req) => (
              <div key={req._id} className="bg-white border border-orange-200 bg-orange-50/30 rounded-2xl p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                    <User size={20} className="text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-black">{req.name || req.user_id?.name || 'Unknown'}</p>
                    {req.mobile && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Phone size={10} className="text-slate-400" />
                        <p className="text-[10px] text-slate-400 font-bold">{req.mobile}</p>
                      </div>
                    )}
                    <p className="text-[9px] text-slate-400 font-bold mt-1">
                      Requested {new Date(req.requestedAt).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <select
                      id={`role-${req._id}`}
                      defaultValue="All-rounder"
                      className="bg-white border border-black/10 rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-widest outline-none"
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const role = document.getElementById(`role-${req._id}`)?.value || 'All-rounder';
                          approvePlayer(req._id, role);
                        }}
                        className="flex-1 flex items-center justify-center gap-1 bg-emerald-500 hover:bg-emerald-400 text-black font-black py-2 px-3 rounded-xl text-[10px] uppercase tracking-widest transition-all"
                      >
                        <CheckCircle2 size={12} />Approve
                      </button>
                      <button
                        onClick={() => rejectPlayer(req._id)}
                        className="flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-500 font-black py-2 px-3 rounded-xl text-[10px] transition-all"
                      >
                        <XCircle size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Player Tab */}
        {activeTab === 'add' && (
          <div className="space-y-5">
            {/* Mobile Lookup */}
            <div className="bg-white border border-black/8 rounded-2xl p-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Add Player by Mobile Number</p>
              <p className="text-xs text-slate-500 mb-5">
                Enter the player's registered mobile number to find and add them directly to your squad. The player must already have an account on The Turf app.
              </p>

              <div className="flex gap-3 mb-4">
                <div className="flex-1 relative">
                  <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    value={addMobile}
                    onChange={e => {
                      setAddMobile(e.target.value);
                      lookupByMobile(e.target.value);
                    }}
                    className="w-full pl-10 pr-4 py-3 border border-black/10 rounded-xl text-sm font-bold outline-none focus:border-emerald-400 bg-black/2 tracking-wider"
                  />
                </div>
                <select
                  value={addRole}
                  onChange={e => setAddRole(e.target.value)}
                  className="px-3 py-3 border border-black/10 rounded-xl text-[11px] font-black uppercase tracking-widest outline-none bg-black/2"
                >
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <input
                  type="number"
                  placeholder="#"
                  value={addJersey}
                  onChange={e => setAddJersey(e.target.value)}
                  className="w-16 px-3 py-3 border border-black/10 rounded-xl text-[11px] font-black text-center outline-none focus:border-emerald-400 bg-black/2"
                  title="Jersey Number"
                />
              </div>

              {/* Lookup Result Preview */}
              {lookupLoading && (
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-black/5 mb-4">
                  <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                  <p className="text-xs font-bold text-slate-400">Looking up player...</p>
                </div>
              )}

              {!lookupLoading && lookupUser && (
                <div className="flex items-center gap-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl mb-4">
                  <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-black text-lg">
                    {lookupUser.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-black">{lookupUser.name}</p>
                    <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">
                      {lookupUser.cricket_profile?.primary_role || 'Player'} · {lookupUser.phone || lookupUser.mobileNumber}
                    </p>
                  </div>
                  <CheckCircle2 size={20} className="text-emerald-500" />
                </div>
              )}

              {!lookupLoading && addMobile.replace(/\D/g,'').length === 10 && !lookupUser && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl mb-4">
                  <AlertCircle size={18} className="text-red-500" />
                  <p className="text-xs font-bold text-red-500">No player found. Ask them to register on the app first.</p>
                </div>
              )}

              <button
                onClick={addPlayerByMobile}
                disabled={addingPlayer || !lookupUser}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black py-4 rounded-xl text-[11px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20"
              >
                {addingPlayer ? (
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <Plus size={16} />
                )}
                {addingPlayer ? 'Adding...' : 'Add to Squad'}
              </button>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
              <div className="flex gap-3">
                <Zap size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-black text-blue-700 mb-1">How it works</p>
                  <ul className="text-[11px] text-blue-600 font-bold space-y-1 list-disc list-inside">
                    <li>Player must have a registered account on The Turf app</li>
                    <li>Enter their registered 10-digit mobile number</li>
                    <li>Preview their profile, then click Add to Squad</li>
                    <li>Alternatively, share the QR Code for players to request joining</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* QR Tab */}
        {activeTab === 'qr' && (
          <div className="bg-white border border-black/8 rounded-2xl p-8 text-center">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-6">Team QR Code</p>
            {team.qrCode ? (
              <>
                <div className="bg-white border-2 border-black/10 rounded-2xl p-6 inline-block mb-6">
                  <img src={team.qrCode} alt="QR" className="w-48 h-48" />
                </div>
                <div className="space-y-3 max-w-xs mx-auto">
                  <div className="bg-black/3 rounded-xl p-4">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Team Code</p>
                    <p className="font-black text-black text-lg">{team.teamCode}</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Join Code</p>
                    <div className="flex items-center justify-between">
                      <p className="font-black text-emerald-700 text-lg">{team.joinCode}</p>
                      <button onClick={copyJoinCode} className={`transition-colors ${copied ? 'text-emerald-500' : 'text-emerald-400 hover:text-emerald-600'}`}>
                        {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 font-bold mt-6">
                  Players can scan this QR to request joining your team. You'll see their requests in the Requests tab.
                </p>
              </>
            ) : (
              <div>
                <AlertCircle size={40} className="text-slate-300 mx-auto mb-4" />
                <p className="text-slate-400 font-bold">QR not generated yet</p>
                <button
                  onClick={async () => {
                    try {
                      const res = await apiClient.post(`/teams/${id}/regenerate-qr`);
                      if (res.data.success) { toast.success('QR regenerated!'); fetchTeam(); }
                    } catch {}
                  }}
                  className="mt-4 bg-emerald-500 text-black font-black px-6 py-2 rounded-xl uppercase tracking-widest text-xs"
                >
                  Generate QR
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

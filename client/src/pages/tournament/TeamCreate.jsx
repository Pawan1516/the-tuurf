import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Shield, MapPin, Phone, Upload, Copy, CheckCircle2, QrCode, Trophy, ChevronRight } from 'lucide-react';
import apiClient from '../../api/client';
import { toast } from 'react-toastify';

const Label = ({ children, required }) => (
  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
    {children} {required && <span className="text-red-500">*</span>}
  </label>
);

const Input = ({ ...props }) => (
  <input
    {...props}
    className="w-full bg-black/3 border border-black/10 rounded-xl px-4 py-3 text-sm font-bold text-black placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-emerald-50/30 transition-all"
  />
);

export default function TeamCreate() {
  const navigate = useNavigate();
  const [step, setStep] = useState('form'); // 'form' | 'success'
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [team, setTeam] = useState(null);
  const [data, setData] = useState({
    name: '',
    shortName: '',
    city: '',
    logo: '',
    jersey: '',
    contactNumber: '',
    captainName: '',
    primaryColor: '#10b981'
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!data.name.trim()) return toast.error('Team name is required');
    setSaving(true);
    try {
      const res = await apiClient.post('/teams/create', data);
      if (res.data.success) {
        setTeam(res.data.team);
        setStep('success');
        toast.success('Team created! 🎉');
      } else {
        toast.error(res.data.message || 'Failed to create team');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating team');
    } finally {
      setSaving(false);
    }
  };

  const copyJoinCode = () => {
    navigator.clipboard.writeText(team?.joinCode || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (step === 'success' && team) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center px-6">
        <div className="bg-white border border-black/8 rounded-3xl p-10 max-w-md w-full text-center shadow-2xl shadow-emerald-500/10">
          <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-emerald-600" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-black mb-2">Team Created!</h2>
          <p className="text-slate-400 text-sm font-medium mb-8">{team.name} is ready. Share the join code with players!</p>

          {/* Team Code Display */}
          <div className="bg-black/3 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Team ID</p>
                <p className="text-lg font-black text-black">{team.teamCode}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Join Code</p>
                <p className="text-lg font-black text-emerald-600">{team.joinCode}</p>
              </div>
            </div>
            <button
              onClick={copyJoinCode}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                copied ? 'bg-emerald-500 text-white' : 'bg-black/5 text-slate-600 hover:bg-black/8'
              }`}
            >
              {copied ? <><CheckCircle2 size={14} />Copied!</> : <><Copy size={14} />Copy Join Code</>}
            </button>
          </div>

          {/* QR Code */}
          {team.qrCode && (
            <div className="mb-6">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Team QR Code</p>
              <div className="bg-white border-2 border-black/10 rounded-2xl p-4 inline-block">
                <img src={team.qrCode} alt="Team QR" className="w-40 h-40 mx-auto" />
              </div>
              <p className="text-[9px] text-slate-400 font-bold mt-2">Players scan this QR to request joining</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => navigate(`/teams/${team._id}`)}
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-black py-3 rounded-xl uppercase tracking-widest text-xs transition-all"
            >
              View Team
            </button>
            <button
              onClick={() => { setStep('form'); setData({ name:'', shortName:'', city:'', logo:'', jersey:'', contactNumber:'', captainName:'', primaryColor:'#10b981' }); }}
              className="flex-1 bg-black/5 hover:bg-black/8 text-slate-600 font-black py-3 rounded-xl uppercase tracking-widest text-xs transition-all"
            >
              Create Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 to-emerald-950 text-white py-12 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-xl p-2.5">
              <Users size={22} className="text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight">Create Your Team</h1>
              <p className="text-white/40 text-xs font-bold uppercase tracking-[0.3em]">QR-Powered Team Management</p>
            </div>
          </div>
          <p className="text-white/50 text-sm">
            Your team gets a unique Team ID, Join Code, and QR code that players can scan to request joining.
          </p>

          {/* Feature chips */}
          <div className="flex gap-3 mt-6 flex-wrap">
            {['🆔 Unique Team ID', '📲 QR Join Code', '👨‍✈️ Captain Approval', '👥 Up to 25 Players'].map(f => (
              <span key={f} className="bg-white/10 border border-white/15 rounded-xl px-3 py-1.5 text-[10px] font-black text-white/70 uppercase tracking-widest">
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-6 py-10">
        <form onSubmit={handleCreate}>
          <div className="bg-white border border-black/8 rounded-3xl p-8 space-y-6">
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight text-black mb-1">Team Details</h2>
              <p className="text-slate-400 text-xs">Fill in your team information</p>
            </div>

            <div>
              <Label required>Team Name</Label>
              <Input
                placeholder="e.g. Dragon Hunters"
                value={data.name}
                onChange={e => setData({ ...data, name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Short Name (3-5 chars)</Label>
                <Input
                  placeholder="e.g. DH"
                  maxLength={5}
                  value={data.shortName}
                  onChange={e => setData({ ...data, shortName: e.target.value.toUpperCase() })}
                />
              </div>
              <div>
                <Label>City</Label>
                <Input
                  placeholder="e.g. Hyderabad"
                  value={data.city}
                  onChange={e => setData({ ...data, city: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Captain Name</Label>
              <Input
                placeholder="Your name"
                value={data.captainName}
                onChange={e => setData({ ...data, captainName: e.target.value })}
              />
            </div>

            <div>
              <Label>Contact Number</Label>
              <div className="relative">
                <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={data.contactNumber}
                  onChange={e => setData({ ...data, contactNumber: e.target.value })}
                  className="w-full bg-black/3 border border-black/10 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-black placeholder-slate-400 outline-none focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <div>
              <Label>Team Logo URL</Label>
              <Input
                placeholder="https://..."
                value={data.logo}
                onChange={e => setData({ ...data, logo: e.target.value })}
              />
              {data.logo && (
                <div className="mt-2 w-12 h-12 rounded-xl overflow-hidden border border-black/10">
                  <img src={data.logo} alt="logo" className="w-full h-full object-cover" onError={e => e.target.style.display = 'none'} />
                </div>
              )}
            </div>

            <div>
              <Label>Jersey Image URL</Label>
              <Input
                placeholder="https://..."
                value={data.jersey}
                onChange={e => setData({ ...data, jersey: e.target.value })}
              />
            </div>

            <div>
              <Label>Team Primary Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={data.primaryColor}
                  onChange={e => setData({ ...data, primaryColor: e.target.value })}
                  className="w-12 h-12 rounded-xl border border-black/10 cursor-pointer p-1"
                />
                <span className="text-sm font-bold text-slate-600">{data.primaryColor}</span>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <QrCode size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-black text-emerald-800 uppercase tracking-wide">Auto-Generated</p>
                  <p className="text-[10px] text-emerald-700 font-medium mt-1">
                    Your team will automatically receive a unique Team ID, Join Code, and QR Code that players can scan to request joining your squad.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving || !data.name.trim()}
              className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black py-4 rounded-2xl uppercase tracking-widest text-sm transition-all shadow-lg shadow-emerald-500/20"
            >
              {saving ? (
                <><div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />Creating Team...</>
              ) : (
                <><Users size={18} />Create Team & Generate QR</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

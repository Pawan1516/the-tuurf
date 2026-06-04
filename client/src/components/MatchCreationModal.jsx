import React, { useState, useEffect } from 'react';
import {
  X, Trophy, Shield, CheckCircle2, Star, BadgeCheck, MessageCircle,
  QrCode, Download, Share2, ChevronRight, Zap, BarChart2, Users, Clock,
  AlertCircle, RefreshCw, Swords, ChevronLeft, Layout, Sparkles, Fingerprint, Phone, UserPlus
} from 'lucide-react';
import apiClient from '../api/client';
import { toast } from 'react-toastify';

// ── Shared UI Components for the "Clean" Look
const CleanModalContainer = ({ children, className = "" }) => (
  <div className={`relative bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden flex flex-col ${className}`}>
    {children}
  </div>
);

// ── Step 8: Player Registration (No OTP)
const PlayerRegistrationNode = ({ onNext, teamLabel }) => {
  const [mobile, setMobile] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (mobile.length !== 10) return toast.error('Enter a valid 10-digit mobile number.');
    setLoading(true);
    try {
      const res = await apiClient.post('/players/register-no-otp', { mobile, name });
      if (res.data.success) {
        toast.success(res.data.message);
        onNext(res.data.user);
        setMobile(''); setName('');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 md:p-10 space-y-8 animate-in slide-in-from-right-8 duration-500 h-full flex flex-col justify-center">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full text-emerald-600">
          <UserPlus size={14} />
          <span className="text-xs font-semibold tracking-wide uppercase">Player Registration</span>
        </div>
        <h3 className="text-3xl font-bold text-slate-800 leading-tight">
          Add Player to <span className="text-emerald-600">Team {teamLabel}</span>
        </h3>
        <p className="text-sm font-medium text-slate-500">Quick identity fetch via mobile number</p>
      </div>

      <div className="space-y-5">
        <div className="relative">
          <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 peer-focus:text-emerald-600 transition-colors" size={20} />
          <input 
            autoFocus
            type="tel"
            placeholder="Enter 10-digit mobile"
            className="peer w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-14 pr-6 text-lg font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-sm"
            value={mobile}
            onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
          />
        </div>
        <div className="relative">
          <Layout className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 peer-focus:text-emerald-600 transition-colors" size={20} />
          <input 
            placeholder="Player name (Optional)"
            className="peer w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-14 pr-6 text-lg font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-sm"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
        <button 
          onClick={handleRegister}
          disabled={loading || mobile.length < 10}
          className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {loading ? <RefreshCw className="animate-spin w-5 h-5" /> : <ChevronRight className="w-5 h-5" />} FETCH PLAYER
        </button>
      </div>
    </div>
  );
};

// ── Step 12: QR Deployment (Pending Step 13 Admin Scan)
const QRDeploymentNode = ({ match, qrCode, onGoToScoring }) => (
    <div className="flex flex-col h-full animate-in zoom-in-95 duration-500">
      <div className="flex-1 p-8 md:p-12 flex flex-col items-center justify-center text-center space-y-6">
        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-2 text-emerald-600 shadow-sm">
          <Shield size={32} />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-3xl font-bold text-slate-800 leading-tight">Admin <span className="text-emerald-600">Verification</span></h3>
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Mandatory Approval Sequence</p>
        </div>

        <div className="relative p-6 bg-white rounded-3xl shadow-xl border border-slate-100 flex flex-col items-center">
          <img src={qrCode} alt="Match QR" className="w-48 h-48 md:w-56 md:h-56 object-contain" />
          <div className="mt-6 px-4 py-1.5 bg-slate-50 rounded-full border border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">ID: {match?._id?.slice(-8)}</p>
          </div>
        </div>

        <div className="w-full max-w-sm bg-amber-50 rounded-2xl p-5 flex items-start gap-4 text-left border border-amber-200">
          <AlertCircle size={24} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs font-medium text-amber-900 leading-relaxed">Admin must scan this token at reception to transition match status to "APPROVED". Scoring remains locked until verification.</p>
        </div>
      </div>

      <div className="p-6 bg-slate-50 border-t border-slate-100">
        <button onClick={onGoToScoring} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all">
          Awaiting Approval: Enter Dashboard <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
);

const MatchCreationModal = ({ isOpen, onClose, booking, onSuccess }) => {
  const [step, setStep] = useState(0); // 0: Format, 1: Team A Selection, 2: Team B Selection, 3: Match Details, 4: QR
  const [loading, setLoading] = useState(false);
  const [createdMatch, setCreatedMatch] = useState(null);
  const [qrCode, setQrCode] = useState(null);

  const [formData, setFormData] = useState({
    name: 'Weekend Warriors League',
    overs: 10,
    location: 'The Turf Node 01',
    team_a_name: '',
    team_b_name: '',
    team_a_players: [],
    team_b_players: [],
  });

  const addPlayerToTeam = (user, team) => {
    const listField = `team_${team}_players`;
    if (formData[listField].some(p => p.phone === user.phone)) return toast.warn('Duplicate player detected.');
    if (formData[listField].length >= 11) return toast.warn('Team capacity reached (Max 11).');
    
    setFormData(prev => ({
      ...prev,
      [listField]: [...prev[listField], user]
    }));
    toast.success(`${user.name} added to Team ${team.toUpperCase()}`);
  };

  const handleMatchDeploy = async () => {
    if (!formData.team_a_name || !formData.team_b_name) return toast.error('Both teams require a name.');
    if (formData.team_a_players.length === 0 || formData.team_b_players.length === 0) return toast.error('Teams require at least 1 player.');

    setLoading(true);
    try {
      const res = await apiClient.post('/matches/quick/create', {
        title: formData.name,
        location: formData.location,
        overs: formData.overs,
        format: `T${formData.overs}`,
        status: 'Pending',
        team_a: {
          name: formData.team_a_name,
          players: formData.team_a_players.map((p, i) => ({
            display_name: p.name,
            input: p.phone,
            input_type: 'MOBILE',
            user_id: p._id,
            is_captain: i === 0
          }))
        },
        team_b: {
          name: formData.team_b_name,
          players: formData.team_b_players.map((p, i) => ({
            display_name: p.name,
            input: p.phone,
            input_type: 'MOBILE',
            user_id: p._id,
            is_captain: i === 0
          }))
        }
      });

      if (res.data.success) {
        setCreatedMatch(res.data.match);
        setQrCode(res.data.qr_code);
        setStep(4);
        toast.success('Match Created (Pending Approval)');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Deployment failed.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 md:p-6 sm:p-8">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <CleanModalContainer className="w-full max-w-4xl max-h-[90vh] h-full shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white z-10 shrink-0">
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
             <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Step {step + 8} of 12</span>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
             <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white">
          {step === 0 && (
             <div className="p-8 md:p-12 space-y-10 max-w-2xl mx-auto">
                <div className="space-y-3 text-center">
                  <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto text-emerald-600 mb-6 shadow-sm">
                    <Trophy size={32} />
                  </div>
                  <h3 className="text-4xl font-bold text-slate-800 leading-tight">Match <span className="text-emerald-600">Setup</span></h3>
                  <p className="text-base font-medium text-slate-500">Initialize the match parameters</p>
                </div>
                
                <div className="space-y-8 mt-8">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">Match Title</label>
                    <input 
                      placeholder="Enter match name..." 
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-lg font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-sm" 
                      value={formData.name} 
                      onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">Match Format (Overs)</label>
                    <div className="grid grid-cols-3 gap-4">
                      {[5, 10, 20].map(o => (
                        <button 
                          key={o} 
                          onClick={() => setFormData(p => ({ ...p, overs: o }))} 
                          className={`py-4 rounded-2xl font-bold text-lg transition-all border-2 ${formData.overs === o ? 'border-emerald-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50'}`}
                        >
                          {o} Overs
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="pt-4">
                    <button onClick={() => setStep(1)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 hover:bg-slate-800 hover:-translate-y-0.5 active:translate-y-0 transition-all">
                      CONTINUE TO TEAMS <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
             </div>
          )}

          {(step === 1 || step === 2) && (
            <div className="flex h-full flex-col md:flex-row relative min-h-[500px]">
              <div className="flex-1 flex flex-col border-r border-slate-100 relative md:pb-24 pb-20">
                <div className="p-8 pb-4 border-b border-slate-50">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">Team {step === 1 ? 'A' : 'B'} Name</label>
                  <input 
                    placeholder={`Enter Team ${step === 1 ? 'A' : 'B'} Name`} 
                    className="w-full bg-white border-b-2 border-slate-200 py-3 text-2xl font-bold text-slate-800 placeholder:text-slate-300 outline-none focus:border-emerald-600 transition-colors"
                    value={step === 1 ? formData.team_a_name : formData.team_b_name}
                    onChange={e => setFormData(p => ({ ...p, [step === 1 ? 'team_a_name' : 'team_b_name']: e.target.value }))}
                  />
                </div>
                <div className="flex-1 overflow-y-auto">
                  <PlayerRegistrationNode teamLabel={step === 1 ? 'A' : 'B'} onNext={(user) => addPlayerToTeam(user, step === 1 ? 'a' : 'b')} />
                </div>
              </div>
              
              <div className="w-full md:w-[340px] bg-slate-50 flex flex-col h-64 md:h-auto shrink-0 border-t md:border-t-0 border-slate-100 md:pb-24 pb-20">
                <div className="p-6 border-b border-slate-200 bg-white/50">
                  <h4 className="text-sm font-bold text-slate-800 flex items-center justify-between">
                    Team {step === 1 ? 'A' : 'B'} Roster
                    <span className="text-xs font-semibold bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md">{formData[step === 1 ? 'team_a_players' : 'team_b_players'].length}/11</span>
                  </h4>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {formData[step === 1 ? 'team_a_players' : 'team_b_players'].map((p, i) => (
                    <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm animate-in fade-in slide-in-from-left-2">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                          {i+1}
                        </div>
                        <span className="text-sm font-semibold text-slate-800 truncate max-w-[120px]">{p.name || 'Unknown'}</span>
                      </div>
                      <span className="text-xs font-medium text-slate-500">{p.phone}</span>
                    </div>
                  ))}
                  {formData[step === 1 ? 'team_a_players' : 'team_b_players'].length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-10 opacity-70">
                      <Users size={32} className="mb-3 text-slate-300" />
                      <p className="text-sm font-medium">Roster is empty</p>
                      <p className="text-xs mt-1 text-slate-400">Add players using the form</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Bar - Fixed to bottom */}
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-slate-100 flex justify-between gap-4 z-10 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
                <button onClick={() => setStep(step - 1)} className="px-6 py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-bold text-sm tracking-wide flex items-center justify-center hover:bg-slate-50 transition-all hover:-translate-y-0.5 active:translate-y-0">
                  <ChevronLeft className="w-5 h-5 mr-1" /> BACK
                </button>
                <button onClick={() => step === 1 ? setStep(2) : setStep(3)} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all hover:-translate-y-0.5 active:translate-y-0">
                  NEXT STEP <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="p-8 md:p-12 space-y-10 flex flex-col items-center justify-center h-full text-center max-w-2xl mx-auto">
               <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-emerald-600 mb-2 shadow-sm">
                 <Swords size={36} strokeWidth={1.5} />
               </div>
               
               <div className="space-y-3">
                 <h3 className="text-3xl font-bold text-slate-800 leading-tight">Review <span className="text-emerald-600">Deployment</span></h3>
                 <p className="text-sm font-medium text-slate-500">Verify match details before creation</p>
               </div>
               
               <div className="w-full bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mb-6 text-left">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Match Name</p>
                      <p className="text-lg font-bold text-slate-800 mt-1">{formData.name || 'Unnamed Match'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Format</p>
                      <p className="text-lg font-bold text-slate-800 mt-1">{formData.overs} Overs</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6 relative">
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-100 -translate-x-1/2"></div>
                    <div className="pr-4">
                      <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-2">Team A</p>
                      <p className="text-base font-bold text-slate-800 truncate">{formData.team_a_name || 'Team A'}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Users size={14} className="text-slate-400" />
                        <p className="text-sm font-medium text-slate-600">{formData.team_a_players.length} Players</p>
                      </div>
                    </div>
                    <div className="pl-4">
                      <p className="text-xs font-semibold text-rose-500 uppercase tracking-wider mb-2">Team B</p>
                      <p className="text-base font-bold text-slate-800 truncate">{formData.team_b_name || 'Team B'}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Users size={14} className="text-slate-400" />
                        <p className="text-sm font-medium text-slate-600">{formData.team_b_players.length} Players</p>
                      </div>
                    </div>
                  </div>
               </div>

               <div className="flex w-full gap-4 pt-4">
                 <button onClick={() => setStep(2)} className="px-6 py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-bold text-sm tracking-wide flex items-center justify-center hover:bg-slate-50 transition-all hover:-translate-y-0.5 active:translate-y-0">
                   <ChevronLeft className="w-5 h-5" />
                 </button>
                 <button onClick={handleMatchDeploy} disabled={loading} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:hover:translate-y-0">
                   {loading ? <RefreshCw className="animate-spin w-5 h-5" /> : <Zap size={18} fill="white" />} DEPLOY MATCH
                 </button>
               </div>
            </div>
          )}

          {step === 4 && <QRDeploymentNode match={createdMatch} qrCode={qrCode} onGoToScoring={() => { onSuccess(createdMatch); onClose(); }} />}
        </div>
      </CleanModalContainer>
    </div>
  );
};

export default MatchCreationModal;

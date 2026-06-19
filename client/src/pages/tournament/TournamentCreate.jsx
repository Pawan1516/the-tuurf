import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy, Upload, ChevronRight, ChevronLeft, Calendar, MapPin,
  DollarSign, Users, Check, Globe, Shield, Target, Zap, Info
} from 'lucide-react';
import apiClient from '../../api/client';
import { toast } from 'react-toastify';

const TOTAL_STEPS = 5;

const StepIndicator = ({ step }) => (
  <div className="flex items-center gap-2 mb-10">
    {[1, 2, 3, 4, 5].map(s => (
      <React.Fragment key={s}>
        <div className={`flex items-center justify-center w-9 h-9 rounded-xl font-black text-sm transition-all ${
          s < step ? 'bg-emerald-500 text-white' :
          s === step ? 'bg-black text-white' :
          'bg-black/8 text-slate-400'
        }`}>
          {s < step ? <Check size={16} /> : s}
        </div>
        {s < 5 && <div className={`flex-1 h-0.5 ${s < step ? 'bg-emerald-500' : 'bg-black/10'}`} />}
      </React.Fragment>
    ))}
  </div>
);

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

const TextArea = ({ ...props }) => (
  <textarea
    {...props}
    rows={3}
    className="w-full bg-black/3 border border-black/10 rounded-xl px-4 py-3 text-sm font-bold text-black placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-emerald-50/30 transition-all resize-none"
  />
);

const Select = ({ children, ...props }) => (
  <select
    {...props}
    className="w-full bg-black/3 border border-black/10 rounded-xl px-4 py-3 text-sm font-bold text-black outline-none focus:border-emerald-500 transition-all"
  >
    {children}
  </select>
);

// Step 1: Basic Info
const Step1 = ({ data, setData }) => (
  <div className="space-y-6">
    <div>
      <h2 className="text-2xl font-black uppercase tracking-tight text-black">Tournament Info</h2>
      <p className="text-slate-400 text-sm mt-1">Set the identity of your tournament</p>
    </div>

    <div>
      <Label required>Tournament Name</Label>
      <Input
        placeholder="e.g. Hyderabad Premier League 2026"
        value={data.name}
        onChange={e => setData({ ...data, name: e.target.value })}
      />
    </div>

    <div>
      <Label>Description</Label>
      <TextArea
        placeholder="Describe your tournament, rules, eligibility..."
        value={data.description}
        onChange={e => setData({ ...data, description: e.target.value })}
      />
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label>Tournament Logo URL</Label>
        <Input
          placeholder="https://..."
          value={data.logo}
          onChange={e => setData({ ...data, logo: e.target.value })}
        />
      </div>
      <div>
        <Label>Banner Image URL</Label>
        <Input
          placeholder="https://..."
          value={data.banner}
          onChange={e => setData({ ...data, banner: e.target.value })}
        />
      </div>
    </div>

    {/* Preview */}
    {(data.logo || data.banner) && (
      <div className="relative h-28 rounded-2xl overflow-hidden border border-black/10">
        {data.banner && <img src={data.banner} alt="banner" className="w-full h-full object-cover" onError={e => e.target.style.display='none'} />}
        {!data.banner && <div className="w-full h-full bg-gradient-to-br from-emerald-600 to-teal-700" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        {data.logo && (
          <img
            src={data.logo}
            alt="logo"
            className="absolute bottom-3 left-4 w-10 h-10 rounded-xl object-cover border-2 border-white"
            onError={e => e.target.style.display='none'}
          />
        )}
      </div>
    )}
  </div>
);

// Step 2: Format
const Step2 = ({ data, setData }) => (
  <div className="space-y-6">
    <div>
      <h2 className="text-2xl font-black uppercase tracking-tight text-black">Tournament Format</h2>
      <p className="text-slate-400 text-sm mt-1">Define how the tournament is played</p>
    </div>

    <div>
      <Label required>Tournament Type</Label>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { value: 'league', label: 'League', desc: 'All teams play each other', icon: '🔄' },
          { value: 'knockout', label: 'Knockout', desc: 'Win or go home', icon: '⚔️' },
          { value: 'league_knockout', label: 'League + Knockout', desc: 'Top teams qualify to playoffs', icon: '🏆' },
          { value: 'group_playoff', label: 'Group + Playoff', desc: 'Group round robin + playoffs', icon: '⚡' },
          { value: 'double_elimination', label: 'Double Elimination', desc: 'Winners and Losers brackets', icon: '🛡️' },
        ].map(opt => (
          <button
            key={opt.value}
            onClick={() => setData({ ...data, tournamentType: opt.value })}
            className={`p-4 rounded-2xl border-2 text-left transition-all ${
              data.tournamentType === opt.value
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-black/10 hover:border-black/20'
            }`}
          >
            <div className="text-2xl mb-2">{opt.icon}</div>
            <p className="text-xs font-black text-black uppercase tracking-wide">{opt.label}</p>
            <p className="text-[9px] text-slate-400 mt-1">{opt.desc}</p>
          </button>
        ))}
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label required>Ball Type</Label>
        <Select value={data.ballType} onChange={e => setData({ ...data, ballType: e.target.value })}>
          <option value="leather">🔴 Leather Ball</option>
          <option value="tennis">🟡 Tennis Ball</option>
          <option value="hard_tennis">🟢 Hard Tennis Ball</option>
          <option value="rubber">🟠 Rubber Ball</option>
          <option value="tape_ball">⚪ Tape Ball</option>
          <option value="other">Other</option>
        </Select>
      </div>
      <div>
        <Label required>Match Format</Label>
        <Select value={data.matchFormat} onChange={e => setData({ ...data, matchFormat: e.target.value })}>
          <option value="T10">T10</option>
          <option value="T20">T20</option>
          <option value="T30">T30</option>
          <option value="ODI">50 Overs (ODI)</option>
          <option value="custom">Custom</option>
        </Select>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label required>Overs Per Match</Label>
        <Input
          type="number"
          min="5"
          max="50"
          placeholder="20"
          value={data.oversPerMatch}
          onChange={e => setData({ ...data, oversPerMatch: parseInt(e.target.value) || 20 })}
        />
      </div>
      <div>
        <Label required>Number of Teams</Label>
        <Select value={data.totalTeams} onChange={e => setData({ ...data, totalTeams: parseInt(e.target.value) })}>
          {[4, 6, 8, 10, 12, 16, 20, 24, 32].map(n => (
            <option key={n} value={n}>{n} Teams</option>
          ))}
        </Select>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label>Tie-Breaker Method</Label>
        <Select value={data.tieBreakerMethod} onChange={e => setData({ ...data, tieBreakerMethod: e.target.value })}>
          <option value="super_over">⚡ Super Over</option>
          <option value="bowl_out">🎯 Bowl-out</option>
          <option value="boundary_count">🏏 Boundary Count</option>
        </Select>
      </div>
      <div>
        <Label>Reserve Days (delays)</Label>
        <Input
          type="number"
          min="0"
          value={data.reserveDays}
          onChange={e => setData({ ...data, reserveDays: parseInt(e.target.value) || 0 })}
        />
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label>Max Overs per Bowler</Label>
        <Input
          type="number"
          min="1"
          value={data.maxOversBowler}
          onChange={e => setData({ ...data, maxOversBowler: parseInt(e.target.value) || 4 })}
        />
      </div>
      <div>
        <Label>Powerplay Overs</Label>
        <Input
          type="number"
          min="0"
          value={data.powerplayOvers}
          onChange={e => setData({ ...data, powerplayOvers: parseInt(e.target.value) || 0 })}
        />
      </div>
    </div>

    {(data.tournamentType === 'league_knockout' || data.tournamentType === 'group_playoff') && (
      <div>
        <Label>Teams Qualifying for Playoff</Label>
        <Select value={data.leagueTopTeams} onChange={e => setData({ ...data, leagueTopTeams: parseInt(e.target.value) })}>
          {[2, 4, 8].map(n => <option key={n} value={n}>Top {n} Teams</option>)}
        </Select>
      </div>
    )}
  </div>
);

// Step 3: Schedule & Venues
const Step3 = ({ data, setData }) => {
  const addVenue = () => {
    setData({ ...data, venues: [...(data.venues || []), { name: '', city: '', address: '' }] });
  };
  const updateVenue = (i, field, val) => {
    const v = [...(data.venues || [])];
    v[i] = { ...v[i], [field]: val };
    setData({ ...data, venues: v });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black uppercase tracking-tight text-black">Schedule & Venues</h2>
        <p className="text-slate-400 text-sm mt-1">Set dates and locations for matches</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Registration Opens</Label>
          <Input
            type="date"
            value={data.registrationStartDate}
            onChange={e => setData({ ...data, registrationStartDate: e.target.value })}
          />
        </div>
        <div>
          <Label>Registration Closes</Label>
          <Input
            type="date"
            value={data.registrationEndDate}
            onChange={e => setData({ ...data, registrationEndDate: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label required>Tournament Start Date</Label>
          <Input
            type="date"
            value={data.startDate}
            onChange={e => setData({ ...data, startDate: e.target.value })}
          />
        </div>
        <div>
          <Label>Tournament End Date</Label>
          <Input
            type="date"
            value={data.endDate}
            onChange={e => setData({ ...data, endDate: e.target.value })}
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <Label>Venues / Grounds</Label>
          <button onClick={addVenue} className="text-xs font-black text-emerald-600 hover:text-emerald-500 uppercase tracking-widest">
            + Add Venue
          </button>
        </div>
        {(data.venues || []).map((v, i) => (
          <div key={i} className="bg-black/3 rounded-2xl p-4 mb-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Ground/Venue Name" value={v.name} onChange={e => updateVenue(i, 'name', e.target.value)} />
              <Input placeholder="City" value={v.city} onChange={e => updateVenue(i, 'city', e.target.value)} />
            </div>
            <Input placeholder="Full Address" value={v.address} onChange={e => updateVenue(i, 'address', e.target.value)} />
          </div>
        ))}
        {(!data.venues || data.venues.length === 0) && (
          <button onClick={addVenue} className="w-full border-2 border-dashed border-black/15 rounded-2xl py-6 text-slate-400 text-sm font-bold hover:border-emerald-400 hover:text-emerald-600 transition-all">
            + Click to add a venue
          </button>
        )}
      </div>
    </div>
  );
};

// Step 4: Finance
const Step4 = ({ data, setData }) => (
  <div className="space-y-6">
    <div>
      <h2 className="text-2xl font-black uppercase tracking-tight text-black">Finance</h2>
      <p className="text-slate-400 text-sm mt-1">Entry fee and prize pool details</p>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label>Entry Fee (₹)</Label>
        <Input
          type="number"
          min="0"
          placeholder="0 = Free"
          value={data.entryFee}
          onChange={e => setData({ ...data, entryFee: parseFloat(e.target.value) || 0 })}
        />
        <p className="text-[9px] text-slate-400 font-bold mt-1.5">Per team entry fee. Leave 0 for free tournaments.</p>
      </div>
      <div>
        <Label>Total Prize Pool (₹)</Label>
        <Input
          type="number"
          min="0"
          placeholder="0"
          value={data.prizePool}
          onChange={e => setData({ ...data, prizePool: parseFloat(e.target.value) || 0 })}
        />
      </div>
    </div>

    {data.prizePool > 0 && (
      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5">
        <p className="text-xs font-black text-yellow-700 uppercase tracking-widest mb-4">Prize Distribution</p>
        <div className="space-y-3">
          {[
            { key: 'first', label: '🥇 1st Place' },
            { key: 'second', label: '🥈 2nd Place' },
            { key: 'third', label: '🥉 3rd Place' },
          ].map(p => (
            <div key={p.key} className="flex items-center gap-3">
              <span className="text-xs font-black text-yellow-700 w-24">{p.label}</span>
              <input
                type="number"
                min="0"
                placeholder="₹"
                value={data.prizeDistribution?.[p.key] || ''}
                onChange={e => setData({
                  ...data,
                  prizeDistribution: { ...data.prizeDistribution, [p.key]: parseFloat(e.target.value) || 0 }
                })}
                className="flex-1 bg-white border border-yellow-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-yellow-400"
              />
            </div>
          ))}
        </div>
      </div>
    )}

    <div>
      <Label>Visibility</Label>
      <div className="grid grid-cols-2 gap-3">
        {[
          { value: 'public', label: 'Public', desc: 'Anyone can view and join', icon: <Globe size={16} /> },
          { value: 'private', label: 'Private', desc: 'Invite only', icon: <Shield size={16} /> },
        ].map(opt => (
          <button
            key={opt.value}
            onClick={() => setData({ ...data, visibility: opt.value })}
            className={`p-4 rounded-2xl border-2 text-left flex items-start gap-3 transition-all ${
              data.visibility === opt.value ? 'border-emerald-500 bg-emerald-50' : 'border-black/10'
            }`}
          >
            <div className={data.visibility === opt.value ? 'text-emerald-600' : 'text-slate-400'}>{opt.icon}</div>
            <div>
              <p className="text-xs font-black text-black uppercase">{opt.label}</p>
              <p className="text-[9px] text-slate-400 mt-0.5">{opt.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  </div>
);

// Step 5: Review
const Step5 = ({ data }) => (
  <div className="space-y-6">
    <div>
      <h2 className="text-2xl font-black uppercase tracking-tight text-black">Review & Confirm</h2>
      <p className="text-slate-400 text-sm mt-1">Double-check your tournament details before creating</p>
    </div>

    <div className="bg-black/3 rounded-3xl p-6 space-y-4">
      {[
        { label: 'Name', value: data.name },
        { label: 'Type', value: data.tournamentType?.replace('_', ' + ').toUpperCase() },
        { label: 'Format', value: `${data.matchFormat} (${data.oversPerMatch} overs)` },
        { label: 'Ball', value: data.ballType?.replace('_', ' ').toUpperCase() },
        { label: 'Teams', value: data.totalTeams },
        { label: 'Tie-Breaker', value: data.tieBreakerMethod?.replace('_', ' ').toUpperCase() },
        { label: 'Reserve Days', value: data.reserveDays > 0 ? `${data.reserveDays} Days` : 'None' },
        { label: 'Max Bowler Overs', value: data.maxOversBowler },
        { label: 'Powerplay Overs', value: data.powerplayOvers },
        { label: 'Start', value: data.startDate ? new Date(data.startDate).toLocaleDateString('en-IN') : 'TBD' },
        { label: 'Entry Fee', value: data.entryFee > 0 ? `₹${data.entryFee}` : 'Free' },
        { label: 'Prize Pool', value: data.prizePool > 0 ? `₹${data.prizePool}` : 'None' },
        { label: 'Visibility', value: data.visibility || 'Public' },
      ].map(item => (
        <div key={item.label} className="flex justify-between items-center border-b border-black/5 pb-3">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</span>
          <span className="text-xs font-black text-black">{item.value || '—'}</span>
        </div>
      ))}
    </div>

    {data.venues?.length > 0 && (
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Venues</p>
        {data.venues.map((v, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <MapPin size={12} className="text-emerald-500" />
            <span className="text-xs font-bold text-black">{v.name}{v.city ? `, ${v.city}` : ''}</span>
          </div>
        ))}
      </div>
    )}
  </div>
);

const STEPS = [Step1, Step2, Step3, Step4, Step5];

const INITIAL_DATA = {
  name: '',
  description: '',
  logo: '',
  banner: '',
  tournamentType: 'league',
  ballType: 'leather',
  tieBreakerMethod: 'super_over',
  matchFormat: 'T20',
  oversPerMatch: 20,
  totalTeams: 8,
  leagueTopTeams: 4,
  registrationStartDate: '',
  registrationEndDate: '',
  startDate: '',
  endDate: '',
  venues: [],
  entryFee: 0,
  prizePool: 0,
  prizeDistribution: { first: 0, second: 0, third: 0 },
  visibility: 'public',
  reserveDays: 0,
  maxOversBowler: 4,
  powerplayOvers: 6
};

export default function TournamentCreate() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState(INITIAL_DATA);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const StepComponent = STEPS[step - 1];

  const canNext = () => {
    if (step === 1) return data.name.trim().length >= 3;
    if (step === 2) return data.tournamentType && data.matchFormat && data.totalTeams;
    if (step === 3) return data.startDate;
    return true;
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      const payload = {
        ...data,
        status: 'draft',
        registrationStartDate: data.registrationStartDate || undefined,
        registrationEndDate: data.registrationEndDate || undefined,
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
        rules: {
          minPlayersPerTeam: 7,
          maxPlayersPerTeam: 11,
          playingXISize: 11,
          substitutes: 4,
          powerplayOvers: data.powerplayOvers || 6,
          maxOversBowler: data.maxOversBowler || 4,
          dls: false,
          superOver: data.tieBreakerMethod === 'super_over',
          bonusPoints: false
        }
      };
      const res = await apiClient.post('/tournaments/create', payload);
      if (res.data.success) {
        toast.success('Tournament created! 🏆');
        navigate(`/tournaments/${res.data.tournament._id}`);
      } else {
        toast.error(res.data.message || 'Failed to create');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating tournament');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-80 bg-gradient-to-b from-slate-900 to-emerald-950 flex-col p-8 fixed left-0 top-0 bottom-0">
        <div className="flex items-center gap-3 mb-12">
          <div className="bg-emerald-500/20 p-2.5 rounded-xl">
            <Trophy size={22} className="text-emerald-400" />
          </div>
          <div>
            <p className="font-black text-white uppercase tracking-tight">Create Tournament</p>
            <p className="text-[9px] text-emerald-400/60 uppercase tracking-[0.3em]">New Tournament Wizard</p>
          </div>
        </div>

        <div className="space-y-2">
          {[
            { s: 1, label: 'Basic Info', icon: Info },
            { s: 2, label: 'Format', icon: Target },
            { s: 3, label: 'Schedule', icon: Calendar },
            { s: 4, label: 'Finance', icon: DollarSign },
            { s: 5, label: 'Review', icon: Check },
          ].map(({ s, label, icon: Icon }) => (
            <div
              key={s}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                s === step ? 'bg-emerald-500/20 border border-emerald-500/30' :
                s < step ? 'opacity-70' : 'opacity-30'
              }`}
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${
                s < step ? 'bg-emerald-500 text-white' :
                s === step ? 'bg-white text-emerald-800' :
                'bg-white/10 text-white/50'
              }`}>
                {s < step ? <Check size={13} /> : s}
              </div>
              <span className={`text-xs font-black uppercase tracking-widest ${
                s === step ? 'text-emerald-300' : 'text-white/50'
              }`}>{label}</span>
            </div>
          ))}
        </div>

        <div className="mt-auto">
          <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">Step {step} of {TOTAL_STEPS}</p>
          <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 lg:ml-80 flex flex-col min-h-screen">
        {/* Mobile progress */}
        <div className="lg:hidden bg-white border-b border-black/8 px-6 py-4">
          <StepIndicator step={step} />
        </div>

        <div className="flex-1 flex items-start justify-center py-12 px-6">
          <div className="w-full max-w-2xl">
            {/* Desktop step indicator */}
            <div className="hidden lg:block">
              <StepIndicator step={step} />
            </div>

            <div className="bg-white rounded-3xl border border-black/8 p-8">
              <StepComponent data={data} setData={setData} />
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/tournaments')}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl border border-black/10 text-sm font-black text-slate-600 hover:bg-black/5 transition-all"
              >
                <ChevronLeft size={16} />
                {step === 1 ? 'Cancel' : 'Back'}
              </button>

              {step < TOTAL_STEPS ? (
                <button
                  onClick={() => setStep(s => s + 1)}
                  disabled={!canNext()}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black px-8 py-3 rounded-2xl transition-all shadow-lg shadow-emerald-500/20"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  onClick={handleCreate}
                  disabled={saving || !data.name}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-black px-8 py-3 rounded-2xl transition-all shadow-lg shadow-emerald-500/20"
                >
                  {saving ? (
                    <><div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />Creating...</>
                  ) : (
                    <><Trophy size={16} />Create Tournament</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

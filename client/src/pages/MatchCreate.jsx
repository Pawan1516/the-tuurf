import React, { useState, useEffect } from 'react';
import { useMatchFlow } from '../context/MatchFlowContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bot, Settings2, Calendar, Hash, Users, Trophy, ChevronRight, Zap, MapPin } from 'lucide-react';
import { BACKEND_ORIGIN as API } from '../api/client';

export default function MatchCreate() {
  const { updateMatch, initMatch } = useMatchFlow();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('bookingId') || '';

  const [activeTab, setActiveTab] = useState('ai'); // 'ai' | 'manual'
  const [form, setForm] = useState({
    matchName: '',
    matchType: '10 overs',
    customOvers: '',
    playersPerTeam: 6,
    ballType: 'tennis',
    dateTime: new Date().toISOString().slice(0, 16),
    bookingId,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [animIn, setAnimIn] = useState(false);

  // AI-assisted states
  const [aiConfigured, setAiConfigured] = useState(false);
  const [aiLog, setAiLog] = useState('');

  useEffect(() => {
    setTimeout(() => setAnimIn(true), 50);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const getOvers = () => {
    if (form.matchType === 'Custom') return parseInt(form.customOvers) || 10;
    return parseInt(form.matchType) || 10;
  };

  // 🤖 AI Optimization setup
  const runAIEngine = () => {
    setLoading(true);
    setError('');
    
    setTimeout(() => {
      // Analyze current settings (time, booking) to optimize
      const isNightMatch = new Date(form.dateTime).getHours() >= 17;
      const isWeekend = [0, 6].includes(new Date(form.dateTime).getDay());
      
      const suggestedOvers = bookingId ? '8 overs' : isNightMatch ? '10 overs' : '15 overs';
      const suggestedBall = isNightMatch ? 'tennis' : 'leather';
      const suggestedPlayers = bookingId ? 6 : 8;
      
      // Auto-Draft Match Names
      const prefixes = ['The Turf', 'Miyapur', 'Floodlight', 'Super Over', 'Sunday Night'];
      const suffixes = ['Derby', 'Championship', 'Premier League', 'Clash', 'Showdown'];
      const randomName = `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${suffixes[Math.floor(Math.random() * suffixes.length)]} – ${new Date(form.dateTime).toLocaleDateString()}`;

      setForm(prev => ({
        ...prev,
        matchName: randomName,
        matchType: suggestedOvers,
        ballType: suggestedBall,
        playersPerTeam: suggestedPlayers
      }));

      const explainLog = `🤖 AI Setup Engine optimized!\n• Captured slot: ${bookingId ? `Booking #${bookingId.slice(-8)}` : 'Manual Slot'}\n• Match name: "${randomName}"\n• Recommends ${suggestedOvers} & ${suggestedBall} ball because night matches at Miyapur Turf have high dew factors.\n• Squad size optimized to ${suggestedPlayers} players per team for optimal field coverage.`;

      setAiLog(explainLog);
      setAiConfigured(true);
      setLoading(false);
    }, 800);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const body = {
        booking_id: form.bookingId || undefined,
        title: form.matchName || `Match – ${new Date(form.dateTime).toLocaleDateString()}`,
        format: form.matchType,
        overs: getOvers(),
        team_a: { name: 'Team A' },
        team_b: { name: 'Team B' },
      };

      const res = await fetch(`${API}/api/matches/from-booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create match');

      updateMatch({ ...form, overs: getOvers(), matchId: data.match._id });
      initMatch(data.match._id, data.qr_code);
      navigate(`/match/qr-gate/${data.match._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`w-full max-w-xl mx-auto px-4 pb-24 transition-all duration-700 ease-out ${animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
      
      {/* Header */}
      <div className="text-center mb-8 pt-8">
        <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-emerald-500/5">
          <Trophy size={28} />
        </div>
        <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Setup Match</h1>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Configure Game Rules & Environment</p>
      </div>

      {/* Tab Selector */}
      <div className="grid grid-cols-2 gap-2 bg-white/5 p-1.5 rounded-[1.25rem] border border-white/5 mb-8 shadow-inner">
        <button
          type="button"
          onClick={() => setActiveTab('ai')}
          className={`flex items-center justify-center gap-2 py-3 px-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'ai' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-md' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
        >
          <Bot size={16} /> <span className="hidden sm:inline">AI Assistant</span><span className="sm:hidden">AI</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('manual')}
          className={`flex items-center justify-center gap-2 py-3 px-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'manual' ? 'bg-white/10 border-white/10 text-white shadow-md' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
        >
          <Settings2 size={16} /> <span className="hidden sm:inline">Manual Config</span><span className="sm:hidden">Manual</span>
        </button>
      </div>

      {/* Main card */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* subtle background glow */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />

        {activeTab === 'ai' ? (
          /* 🤖 AI Tab View */
          <div className="space-y-6 animate-in fade-in duration-300 relative z-10">
            <div className="text-center p-6 bg-gradient-to-br from-emerald-500/10 to-indigo-500/5 border border-emerald-500/20 rounded-3xl shadow-inner">
              <Bot size={40} className="text-emerald-400 mx-auto mb-3" />
              <h3 className="text-lg font-black text-white tracking-tight">AI Setup Optimization</h3>
              <p className="text-xs text-slate-400 mt-1">Analyze timings & slot rules to generate the ultimate balanced match setting</p>
            </div>

            <div className="space-y-5">
              <Field label="Linked Booking ID" icon={<Hash size={14}/>}>
                <input
                  name="bookingId" type="text"
                  value={form.bookingId} onChange={handleChange}
                  placeholder="e.g. 64f1d4f23ea..."
                  className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </Field>

              <Field label="Match Date & Time" icon={<Calendar size={14}/>}>
                <input
                  name="dateTime" type="datetime-local"
                  value={form.dateTime} onChange={handleChange}
                  className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </Field>

              <button
                type="button"
                onClick={runAIEngine}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-500 text-black rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 hover:bg-emerald-400 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? <Zap className="animate-pulse" size={16} /> : <Bot size={16} />}
                {loading ? 'Running Smart AI...' : 'Generate Setup via AI'}
              </button>

              {aiConfigured && (
                <div className="bg-black/30 border border-white/5 rounded-2xl p-5 mt-4 animate-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-2 font-black text-emerald-400 text-[10px] uppercase tracking-widest mb-3">
                    <Zap size={12} className="fill-emerald-400" /> AI Setup Log
                  </div>
                  <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                    {aiLog}
                  </pre>
                </div>
              )}

              {aiConfigured && (
                <form onSubmit={handleSubmit} className="mt-6 pt-6 border-t border-white/5 animate-in slide-in-from-bottom-4 duration-500">
                  {error && <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-bold mb-4">{error}</div>}
                  <button
                    type="submit" disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 active:scale-[0.98] transition-all"
                  >
                    Confirm & Generate QR <ChevronRight size={16} />
                  </button>
                </form>
              )}
            </div>
          </div>
        ) : (
          /* Manual Tab View */
          <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-300 relative z-10">
            <Field label="Match Name" icon={<Trophy size={14}/>}>
              <input
                name="matchName" type="text"
                value={form.matchName} onChange={handleChange}
                placeholder="e.g. Sunday Clash"
                className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
                required
              />
            </Field>

            <Field label="Match Overs" icon={<Calendar size={14}/>}>
              <div className="grid grid-cols-4 gap-2">
                {['5 overs', '10 overs', '20 overs', 'Custom'].map((type) => (
                  <button
                    key={type} type="button"
                    onClick={() => setForm(p => ({ ...p, matchType: type }))}
                    className={`py-3 px-1 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-tight transition-all ${form.matchType === type ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                  >
                    {type.replace(' overs', 'v')}
                  </button>
                ))}
              </div>
              {form.matchType === 'Custom' && (
                <input
                  name="customOvers" type="number" min="1" max="50"
                  value={form.customOvers} onChange={handleChange}
                  placeholder="Number of overs"
                  className="w-full mt-3 bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
                />
              )}
            </Field>

            <Field label="Players per Team" icon={<Users size={14}/>}>
              <div className="grid grid-cols-5 gap-2">
                {[4, 5, 6, 8, 11].map((n) => (
                  <button
                    key={n} type="button"
                    onClick={() => setForm(p => ({ ...p, playersPerTeam: n }))}
                    className={`py-3 rounded-xl text-sm font-black transition-all ${form.playersPerTeam === n ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Ball Type" icon={<MapPin size={14}/>}>
              <div className="grid grid-cols-3 gap-2">
                {['Tennis', 'Leather', 'Soft'].map((b) => (
                  <button
                    key={b} type="button"
                    onClick={() => setForm(p => ({ ...p, ballType: b.toLowerCase() }))}
                    className={`py-3 rounded-xl text-xs font-bold uppercase tracking-tight transition-all ${form.ballType === b.toLowerCase() ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </Field>

            {error && <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-bold">{error}</div>}

            <button
              type="submit" disabled={loading}
              className="w-full mt-4 flex items-center justify-center gap-2 py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Match & Generate QR'} <ChevronRight size={16} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, icon, children }) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
        {icon} {label}
      </label>
      {children}
    </div>
  );
}

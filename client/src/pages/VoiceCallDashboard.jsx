import React, { useState, useEffect } from 'react';
import { Phone, PhoneCall, PhoneOff, Clock, User, Mic, FileText, Play, RefreshCw, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

const API = (path) => `/api/voice${path}`;
const token = () => localStorage.getItem('token');

const STATUS_COLORS = {
  completed:   'bg-emerald-100 text-emerald-700',
  'in-progress': 'bg-sky-100 text-sky-700',
  initiated:   'bg-violet-100 text-violet-700',
  failed:      'bg-red-100 text-red-600',
  'no-answer': 'bg-amber-100 text-amber-700',
  busy:        'bg-slate-100 text-slate-600',
};

function CallRow({ call, onView }) {
  const directionIcon = call.direction === 'inbound'
    ? <PhoneCall size={14} className="text-emerald-500" />
    : <PhoneOff  size={14} className="text-sky-500" />;

  return (
    <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          {directionIcon}
          <span className="text-xs font-black text-slate-700 capitalize">{call.direction}</span>
        </div>
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center">
            <User size={12} className="text-slate-500" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-800">{call.userId?.name || 'Unknown'}</p>
            <p className="text-[10px] text-slate-400">{call.fromNumber || call.toNumber}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-4">
        <span className={`text-[10px] font-black px-2.5 py-1 rounded-xl uppercase tracking-wide ${STATUS_COLORS[call.status] || 'bg-slate-100 text-slate-600'}`}>
          {call.status}
        </span>
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-1 text-xs text-slate-500 font-bold">
          <Clock size={11} />
          {call.duration ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s` : '—'}
        </div>
      </td>
      <td className="px-5 py-4">
        <p className="text-[11px] text-slate-500">{call.detectedIntent?.replace(/_/g, ' ') || '—'}</p>
      </td>
      <td className="px-5 py-4">
        <p className="text-[10px] text-slate-400">{new Date(call.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</p>
      </td>
      <td className="px-5 py-4">
        <button onClick={() => onView(call)}
          className="text-[11px] font-black px-3 py-1.5 bg-violet-50 text-violet-700 border border-violet-200 rounded-xl hover:bg-violet-100 transition-all">
          View
        </button>
      </td>
    </tr>
  );
}

function CallDetailModal({ call, onClose }) {
  if (!call) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Phone size={18} className="text-white" />
              </div>
              <div>
                <h2 className="font-black text-slate-900">Call Detail</h2>
                <p className="text-xs text-slate-400 font-bold">{call.callSid || 'No SID'}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 transition-all text-slate-500">✕</button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Direction', value: call.direction },
              { label: 'Status', value: call.status },
              { label: 'From', value: call.fromNumber },
              { label: 'To', value: call.toNumber },
              { label: 'Duration', value: call.duration ? `${call.duration}s` : '—' },
              { label: 'Intent', value: call.detectedIntent?.replace(/_/g, ' ') || '—' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-50 rounded-2xl p-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                <p className="text-sm font-black text-slate-800">{value || '—'}</p>
              </div>
            ))}
          </div>

          {/* AI Summary */}
          {call.aiSummary && (
            <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4">
              <p className="text-xs font-black text-violet-600 uppercase tracking-widest mb-2">AI Summary</p>
              <p className="text-sm text-slate-700 leading-relaxed">{call.aiSummary}</p>
            </div>
          )}

          {/* Transcript */}
          {call.transcript && call.transcript.length > 0 && (
            <div>
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Transcript</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {call.transcript.map((line, i) => (
                  <div key={i} className={`flex gap-3 ${line.speaker === 'human' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0
                      ${line.speaker === 'human' ? 'bg-emerald-500 text-white' : 'bg-violet-500 text-white'}`}>
                      {line.speaker === 'human' ? 'U' : 'AI'}
                    </div>
                    <div className={`max-w-[75%] px-3 py-2 rounded-xl text-xs font-medium
                      ${line.speaker === 'human' ? 'bg-emerald-50 text-emerald-900' : 'bg-slate-100 text-slate-800'}`}>
                      {line.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VoiceCallDashboard() {
  const [calls, setCalls]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selectedCall, setSelectedCall] = useState(null);
  const [page, setPage]             = useState(1);
  const [total, setTotal]           = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [directionFilter, setDirectionFilter] = useState('');
  const [newCall, setNewCall]       = useState({ to: '', purpose: 'booking_confirmation' });
  const [calling, setCalling]       = useState(false);
  const [callResult, setCallResult] = useState(null);

  const fetchCalls = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (statusFilter)    params.set('status', statusFilter);
      if (directionFilter) params.set('direction', directionFilter);
      const res  = await fetch(`${API('/calls')}?${params}`, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      if (data.success) { setCalls(data.calls); setTotal(data.total); }
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { fetchCalls(); }, [page, statusFilter, directionFilter]); // eslint-disable-line

  const triggerCall = async (e) => {
    e.preventDefault();
    if (!newCall.to) return;
    setCalling(true); setCallResult(null);
    try {
      const res  = await fetch(API('/call'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(newCall),
      });
      const data = await res.json();
      setCallResult(data);
      if (data.success) { setTimeout(fetchCalls, 3000); }
    } catch (err) { setCallResult({ success: false, error: err.message }); } finally { setCalling(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50/30 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/30">
              <Phone size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">Voice Call Dashboard</h1>
              <p className="text-sm text-slate-500 font-bold">{total} total calls · AI-powered voice agent</p>
            </div>
          </div>
          <button onClick={fetchCalls} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Outbound Call Trigger ── */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <Play size={16} className="text-sky-500" />
              <h2 className="font-black text-slate-900">Trigger Voice Call</h2>
            </div>
            <form onSubmit={triggerCall} className="space-y-4">
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1.5">Phone Number</label>
                <input value={newCall.to} onChange={e => setNewCall(p => ({ ...p, to: e.target.value }))}
                  placeholder="+919999999999"
                  className="w-full text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-sky-400 transition-all"
                  id="voice-call-number" />
              </div>
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1.5">Call Purpose</label>
                <select value={newCall.purpose} onChange={e => setNewCall(p => ({ ...p, purpose: e.target.value }))}
                  className="w-full text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-sky-400 transition-all"
                  id="voice-call-purpose">
                  <option value="booking_confirmation">Booking Confirmation</option>
                  <option value="reminder">1-Hour Reminder</option>
                  <option value="followup">Missed Booking Follow-Up</option>
                  <option value="general">General Inquiry</option>
                </select>
              </div>
              <button type="submit" disabled={calling || !newCall.to}
                className="w-full py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-black text-sm disabled:opacity-50 hover:opacity-90 transition-all shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2">
                <PhoneCall size={16} /> {calling ? 'Calling...' : 'Initiate Call'}
              </button>
            </form>
            {callResult && (
              <div className={`mt-4 p-3 rounded-2xl text-sm font-bold ${callResult.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                {callResult.success ? `✅ Call initiated: ${callResult.callSid}` : `❌ ${callResult.error}`}
              </div>
            )}
          </div>

          {/* ── Call Log Table ── */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-black text-slate-900">Call Log</h2>
              <div className="flex gap-2">
                <select value={directionFilter} onChange={e => setDirectionFilter(e.target.value)}
                  className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none">
                  <option value="">All Directions</option>
                  <option value="inbound">Inbound</option>
                  <option value="outbound">Outbound</option>
                </select>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none">
                  <option value="">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="in-progress">In Progress</option>
                  <option value="failed">Failed</option>
                  <option value="no-answer">No Answer</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['Dir.', 'User', 'Status', 'Duration', 'Intent', 'Time', ''].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} className="text-center py-12 text-slate-400 font-bold text-sm">Loading calls...</td></tr>
                  ) : calls.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-12 text-slate-400 font-bold text-sm">No calls yet</td></tr>
                  ) : (
                    calls.map(call => <CallRow key={call._id} call={call} onView={setSelectedCall} />)
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-400 font-bold">Showing {calls.length} of {total}</p>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="text-xs font-bold px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl disabled:opacity-40 hover:bg-slate-200 transition-all">Prev</button>
                <button disabled={calls.length < 20} onClick={() => setPage(p => p + 1)}
                  className="text-xs font-bold px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl disabled:opacity-40 hover:bg-slate-200 transition-all">Next</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedCall && <CallDetailModal call={selectedCall} onClose={() => setSelectedCall(null)} />}
    </div>
  );
}

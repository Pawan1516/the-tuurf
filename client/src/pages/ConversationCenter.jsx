import React, { useState, useEffect } from 'react';
import { MessageSquare, Bot, User, Clock, Tag, Filter, RefreshCw, Search, ChevronDown, CheckCircle, AlertCircle, ArrowUpRight } from 'lucide-react';

const API  = (p) => `/api/ai-platform${p}`;
const token = () => localStorage.getItem('token');

const CHANNEL_ICONS = {
  web: '🌐', whatsapp: '💬', voice: '📞', email: '📧', sms: '📱', telegram: '✈️', api: '🔗',
};
const RESOLUTION_COLORS = {
  resolved:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  escalated: 'bg-amber-50  text-amber-700  border-amber-200',
  pending:   'bg-slate-50  text-slate-600  border-slate-200',
  abandoned: 'bg-red-50    text-red-600    border-red-200',
};

function ConversationCard({ conv, onClick }) {
  const lastMessage = conv.messages?.slice(-1)[0];
  return (
    <div onClick={() => onClick(conv)}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md hover:border-violet-200 transition-all cursor-pointer group">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center text-lg shadow-lg shadow-violet-500/20">
            {CHANNEL_ICONS[conv.channel] || '💬'}
          </div>
          <div>
            <p className="font-black text-slate-900 text-sm">{conv.userId?.name || 'Anonymous'}</p>
            <p className="text-[10px] text-slate-400 font-bold">{conv.channel?.toUpperCase()} · {conv.agentType?.replace(/_/g, ' ')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-black px-2.5 py-1 rounded-xl border capitalize ${RESOLUTION_COLORS[conv.resolution] || RESOLUTION_COLORS.pending}`}>
            {conv.resolution}
          </span>
          <ArrowUpRight size={14} className="text-slate-300 group-hover:text-violet-500 transition-colors" />
        </div>
      </div>
      {lastMessage && (
        <p className="text-xs text-slate-500 font-medium line-clamp-2 mb-3 pl-1">{lastMessage.content}</p>
      )}
      <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
        <div className="flex items-center gap-1">
          <MessageSquare size={10} />
          {conv.messages?.length || 0} messages
        </div>
        <div className="flex items-center gap-1">
          <Clock size={10} />
          {new Date(conv.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
        </div>
      </div>
    </div>
  );
}

function ConversationDetailModal({ conv, onClose }) {
  if (!conv) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center text-lg shadow-lg">
              {CHANNEL_ICONS[conv.channel] || '💬'}
            </div>
            <div>
              <p className="font-black text-slate-900">{conv.userId?.name || 'Anonymous'}</p>
              <p className="text-xs text-slate-400 font-bold">{conv.channel} · {conv.agentType?.replace(/_/g, ' ')} · {conv.resolution}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-all">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {(conv.messages || []).map((msg, i) => {
            const isUser = msg.role === 'user';
            return (
              <div key={i} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0
                  ${isUser ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/20'}`}>
                  {isUser ? <User size={13} className="text-white" /> : <Bot size={13} className="text-white" />}
                </div>
                <div className={`max-w-[78%] flex flex-col gap-1 ${isUser ? 'items-end' : ''}`}>
                  <div className={`px-4 py-3 rounded-2xl text-sm font-medium leading-relaxed whitespace-pre-line
                    ${isUser ? 'bg-emerald-500 text-white rounded-tr-sm' : 'bg-slate-50 border border-slate-100 text-slate-800 rounded-tl-sm'}`}>
                    {msg.content}
                  </div>
                  <div className="flex items-center gap-2">
                    {msg.intent && <span className="text-[10px] text-slate-400 font-bold">{msg.intent.replace(/_/g, ' ')}</span>}
                    <span className="text-[10px] text-slate-300 font-bold">{new Date(msg.timestamp).toLocaleTimeString('en-IN', { timeStyle: 'short' })}</span>
                  </div>
                </div>
              </div>
            );
          })}
          {(!conv.messages || conv.messages.length === 0) && (
            <p className="text-center text-slate-400 text-sm py-8">No messages in this conversation</p>
          )}
        </div>

        {/* Stats Footer */}
        <div className="p-4 border-t border-slate-100 flex gap-4 text-xs font-bold text-slate-500 flex-shrink-0">
          <span>📊 {conv.messages?.length || 0} messages</span>
          {conv.intent && <span>🎯 {conv.intent.replace(/_/g, ' ')}</span>}
          {conv.handedOffToHuman && <span className="text-amber-600">👤 Escalated to human</span>}
          {conv.csat && <span>⭐ CSAT {conv.csat}/5</span>}
        </div>
      </div>
    </div>
  );
}

export default function ConversationCenter() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [total, setTotal]         = useState(0);
  const [selected, setSelected]   = useState(null);
  const [channel, setChannel]     = useState('');
  const [resolution, setResolution] = useState('');

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 24 });
      if (channel)    params.set('channel', channel);
      if (resolution) params.set('resolution', resolution);
      const res  = await fetch(`${API('/conversations')}?${params}`, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      if (data.success) { setConversations(data.conversations); setTotal(data.total); }
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { fetchConversations(); }, [page, channel, resolution]); // eslint-disable-line

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50/20 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/30">
              <MessageSquare size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">Conversation Center</h1>
              <p className="text-sm text-slate-500 font-bold">{total} total conversations across all channels</p>
            </div>
          </div>
          <button onClick={fetchConversations} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <select value={channel} onChange={e => { setChannel(e.target.value); setPage(1); }}
            className="text-sm font-bold bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-violet-400 transition-all">
            <option value="">All Channels</option>
            {['web','whatsapp','voice','email','sms','telegram','api'].map(c => (
              <option key={c} value={c}>{CHANNEL_ICONS[c]} {c}</option>
            ))}
          </select>
          <select value={resolution} onChange={e => { setResolution(e.target.value); setPage(1); }}
            className="text-sm font-bold bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-violet-400 transition-all">
            <option value="">All Status</option>
            <option value="resolved">Resolved</option>
            <option value="pending">Pending</option>
            <option value="escalated">Escalated</option>
            <option value="abandoned">Abandoned</option>
          </select>
          {(channel || resolution) && (
            <button onClick={() => { setChannel(''); setResolution(''); setPage(1); }}
              className="text-sm font-bold px-4 py-2.5 bg-red-50 text-red-500 border border-red-200 rounded-xl hover:bg-red-100 transition-all">
              Clear Filters
            </button>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array(12).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
                <div className="flex gap-3 mb-3"><div className="w-10 h-10 bg-slate-100 rounded-xl" /><div className="flex-1"><div className="h-3 bg-slate-100 rounded mb-2" /><div className="h-2 bg-slate-100 rounded w-2/3" /></div></div>
                <div className="h-8 bg-slate-100 rounded-xl" />
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-24">
            <MessageSquare size={48} className="text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-bold text-lg">No conversations yet</p>
            <p className="text-slate-400 text-sm mt-1">Start chatting with the AI assistant to see conversations here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {conversations.map(conv => <ConversationCard key={conv._id} conv={conv} onClick={setSelected} />)}
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-center gap-3">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-all">
            ← Previous
          </button>
          <span className="text-sm font-bold text-slate-500">Page {page}</span>
          <button disabled={conversations.length < 24} onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-all">
            Next →
          </button>
        </div>
      </div>

      {selected && <ConversationDetailModal conv={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

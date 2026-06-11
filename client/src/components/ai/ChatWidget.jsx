import React, { useState, useRef, useEffect, useContext } from 'react';
import { X, Send, Bot, User, Loader, Sparkles, MessageSquare, Phone, Zap, ChevronDown } from 'lucide-react';
import AuthContext from '../../context/AuthContext';

const API_URL = '/api/ai-platform/chat';

const QUICK_REPLIES = [
  'Book a turf slot',
  'Show available slots',
  'What\'s the pricing?',
  'My bookings',
  'Contact support',
];

function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-4`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-lg
        ${isUser ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-gradient-to-br from-violet-600 to-indigo-600 shadow-violet-500/30'}`}>
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>

      {/* Bubble */}
      <div className={`max-w-[78%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`px-4 py-3 rounded-2xl text-sm font-medium leading-relaxed whitespace-pre-line
          ${isUser
            ? 'bg-emerald-500 text-white rounded-tr-md'
            : 'bg-white border border-slate-100 text-slate-800 shadow-sm rounded-tl-md'}`}>
          {msg.content}
        </div>

        {/* Suggestions */}
        {msg.suggestions && msg.suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {msg.suggestions.slice(0, 3).map((s, i) => (
              <button key={i} data-suggestion={s}
                className="text-[11px] font-bold px-3 py-1.5 bg-violet-50 text-violet-700 border border-violet-200 rounded-xl hover:bg-violet-100 transition-all">
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Metadata */}
        {msg.intent && !isUser && (
          <span className="text-[10px] text-slate-400 font-bold ml-1">
            {msg.intent.replace(/_/g, ' ')} · {msg.agent || 'AI'}
          </span>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 mb-4">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg">
        <Bot size={14} className="text-white" />
      </div>
      <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map(i => (
            <span key={i} className="w-2 h-2 bg-violet-400 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ChatWidget() {
  const { user } = useContext(AuthContext);
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState([{
    id: 'welcome', role: 'assistant',
    content: `🏟️ Hi${user ? ` ${user.name || user.username}` : ''}! I'm your TurfCom AI Assistant.\n\nI can help you book turf slots, check availability, manage bookings, and more.\n\nWhat can I do for you today?`,
    suggestions: QUICK_REPLIES.slice(0, 3),
  }]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId]           = useState(() => `sess-${Date.now()}`);
  const [unread, setUnread]   = useState(0);
  const bottomRef             = useRef(null);
  const inputRef              = useRef(null);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Handle suggestion clicks (event delegation)
  useEffect(() => {
    const handler = (e) => {
      const btn = e.target.closest('[data-suggestion]');
      if (btn) sendMessage(btn.dataset.suggestion);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [messages, loading]); // eslint-disable-line

  async function sendMessage(text) {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg = { id: Date.now(), role: 'user', content: msg };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
        body: JSON.stringify({ message: msg, sessionId, channel: 'web', userId: user?._id }),
      });
      const data = await res.json();
      const aiMsg = {
        id: Date.now() + 1, role: 'assistant',
        content: data.reply || 'I had trouble responding. Please try again.',
        intent: data.intent,
        agent: data.agent,
        suggestions: data.suggestions || [],
        actions: data.actions || [],
      };
      setMessages(prev => [...prev, aiMsg]);
      if (!open) setUnread(n => n + 1);
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: 'assistant',
        content: 'Sorry, I\'m having connectivity issues. Please try again.',
        suggestions: [],
      }]);
    } finally {
      setLoading(false);
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        id="ai-chat-widget-btn"
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-300
          ${open ? 'bg-slate-700 rotate-12' : 'bg-gradient-to-br from-violet-600 to-indigo-600 hover:scale-110'}
          shadow-violet-500/40`}
        aria-label="Open AI Chat">
        {open ? <X size={22} className="text-white" /> : <Bot size={24} className="text-white" />}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
            {unread}
          </span>
        )}
        {!open && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white animate-pulse" />
        )}
      </button>

      {/* Chat Panel */}
      <div className={`fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-24px)] bg-white rounded-3xl shadow-2xl border border-slate-100
        transition-all duration-300 origin-bottom-right overflow-hidden
        ${open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}>

        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Bot size={20} className="text-white" />
            </div>
            <div>
              <p className="text-white font-black text-sm">TurfCom AI</p>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-white/70 text-[10px] font-bold uppercase tracking-wider">Online · All Agents Active</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-yellow-300" />
            <button onClick={() => setOpen(false)} className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all">
              <ChevronDown size={18} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="h-96 overflow-y-auto px-4 py-4 bg-slate-50/50" id="ai-chat-messages">
          {messages.map(m => <Message key={m.id} msg={m} />)}
          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Quick Replies */}
        <div className="px-4 py-2 border-t border-slate-100 flex gap-2 overflow-x-auto no-scrollbar">
          {QUICK_REPLIES.slice(0, 3).map((qr, i) => (
            <button key={i} onClick={() => sendMessage(qr)}
              className="flex-shrink-0 text-[11px] font-bold px-3 py-1.5 bg-violet-50 text-violet-700 border border-violet-200 rounded-xl hover:bg-violet-100 transition-all whitespace-nowrap">
              {qr}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-slate-100 flex gap-2 items-center bg-white">
          <input
            ref={inputRef}
            id="ai-chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask me anything about The Turf..."
            className="flex-1 text-sm font-medium text-slate-800 placeholder-slate-400 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 outline-none focus:border-violet-400 focus:bg-white transition-all"
          />
          <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
            id="ai-chat-send"
            className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-violet-500/30 hover:scale-105 disabled:opacity-50 disabled:scale-100 transition-all">
            {loading ? <Loader size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-2">
          <Zap size={10} className="text-violet-400" />
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Powered by TurfCom AI Platform</span>
        </div>
      </div>
    </>
  );
}

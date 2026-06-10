import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import {
  Bot, Brain, Phone, Zap, MessageSquare, BarChart3, Shield,
  Activity, TrendingUp, Users, Clock, CheckCircle, AlertCircle,
  Settings, Play, RefreshCw, ChevronRight, Sparkles, Target,
  FileText, Workflow, Eye
} from 'lucide-react';
import AuthContext from '../../context/AuthContext';

const API = (path) => `/api/ai-platform${path}`;

// ── Metric Card ───────────────────────────────────────────────────────────────
function MetricCard({ label, value, icon: Icon, color = 'violet', trend, sublabel }) {
  const colors = {
    violet: 'from-violet-500 to-indigo-600 shadow-violet-500/30',
    emerald: 'from-emerald-500 to-teal-600 shadow-emerald-500/30',
    rose:    'from-rose-500 to-pink-600 shadow-rose-500/30',
    amber:   'from-amber-500 to-orange-600 shadow-amber-500/30',
    sky:     'from-sky-500 to-blue-600 shadow-sky-500/30',
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${colors[color]} flex items-center justify-center shadow-lg`}>
          <Icon size={22} className="text-white" />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-black px-2.5 py-1 rounded-xl ${trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <p className="text-3xl font-black text-slate-900 tracking-tight">{value ?? '—'}</p>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{label}</p>
      {sublabel && <p className="text-[11px] text-slate-400 mt-0.5">{sublabel}</p>}
    </div>
  );
}

// ── Agent Status Card ─────────────────────────────────────────────────────────
function AgentCard({ agent }) {
  const typeIcons = {
    support: MessageSquare, sales: TrendingUp, analytics: BarChart3,
    operations: Settings, security: Shield, scheduling: Clock,
    executive: Brain, voice: Phone,
  };
  const Icon = typeIcons[agent.type] || Bot;
  const isActive = agent.status === 'active';

  return (
    <div className={`flex items-center gap-4 p-4 rounded-2xl border transition-all
      ${isActive ? 'bg-emerald-50/50 border-emerald-100' : 'bg-amber-50/50 border-amber-100'}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center
        ${isActive ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' : 'bg-amber-400'}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black text-slate-900 truncate">{agent.name}</p>
        <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wide">{agent.type}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
        <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-emerald-600' : 'text-amber-600'}`}>
          {agent.status}
        </span>
      </div>
    </div>
  );
}

// ── Main Dashboard Page ───────────────────────────────────────────────────────
export default function AIPlatformDashboard() {
  const { user } = useContext(AuthContext);
  const [analytics, setAnalytics] = useState(null);
  const [agents, setAgents]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adminQuery, setAdminQuery] = useState('');
  const [adminReply, setAdminReply] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  const fetchData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [analyticsRes, agentsRes] = await Promise.all([
        fetch(API('/analytics'), { headers }),
        fetch(API('/agents/status'), { headers }),
      ]);
      const [analyticsData, agentsData] = await Promise.all([analyticsRes.json(), agentsRes.json()]);
      if (analyticsData.success) setAnalytics(analyticsData.analytics);
      if (agentsData.success)   setAgents(agentsData.agents);
    } catch { /* silently handle */ } finally {
      setLoading(false); setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); const t = setInterval(fetchData, 30000); return () => clearInterval(t); }, []);

  const askAdmin = async (e) => {
    e.preventDefault();
    if (!adminQuery.trim()) return;
    setAdminLoading(true); setAdminReply('');
    try {
      const res = await fetch('/api/ai-platform/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ message: adminQuery, channel: 'web', userId: user?._id }),
      });
      const data = await res.json();
      setAdminReply(data.reply || 'No response');
    } catch { setAdminReply('Error fetching response.'); } finally { setAdminLoading(false); }
  };

  const QUICK_ADMIN_QUERIES = [
    'How many bookings today?',
    'Show revenue this week',
    'Which turf has highest occupancy?',
    'How many cancellations today?',
    'Predict next week\'s bookings',
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-violet-500/30 animate-pulse">
            <Bot size={30} className="text-white" />
          </div>
          <p className="text-slate-600 font-bold">Initializing AI Platform...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/20 to-indigo-50/20 p-6">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/30">
                <Brain size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900">AI Intelligence Center</h1>
                <p className="text-sm text-slate-500 font-bold">TurfCom — All AI Agents Operational</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => fetchData(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
            <Link to="/admin/ai/conversations"
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-black shadow-lg shadow-violet-500/30 hover:opacity-90 transition-all">
              <Eye size={14} /> View All Conversations
            </Link>
          </div>
        </div>

        {/* ── Metrics Grid ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetricCard label="Total Conversations" value={analytics?.totalConversations?.toLocaleString()} icon={MessageSquare} color="violet" />
          <MetricCard label="Today" value={analytics?.todayConversations} icon={Activity} color="emerald" trend={12} />
          <MetricCard label="This Week" value={analytics?.weekConversations} icon={TrendingUp} color="sky" />
          <MetricCard label="Resolved" value={analytics?.resolved?.toLocaleString()} icon={CheckCircle} color="emerald" sublabel={`${analytics?.resolutionRate ?? 0}% rate`} />
          <MetricCard label="Escalated" value={analytics?.escalated} icon={AlertCircle} color="amber" />
          <MetricCard label="Open Tickets" value={analytics?.openTickets} icon={FileText} color="rose" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Agent Status Panel ── */}
          <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-black text-slate-900">AI Agents</h2>
              <span className="text-xs font-black px-3 py-1 bg-emerald-50 text-emerald-600 rounded-xl">
                {agents.filter(a => a.status === 'active').length}/{agents.length} Active
              </span>
            </div>
            <div className="space-y-3">
              {agents.map(agent => <AgentCard key={agent.id} agent={agent} />)}
            </div>
          </div>

          {/* ── Admin AI Assistant ── */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Sparkles size={16} className="text-white" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900">Admin AI Assistant</h2>
                <p className="text-xs text-slate-400 font-bold">Ask anything about your platform</p>
              </div>
            </div>

            {/* Quick queries */}
            <div className="flex flex-wrap gap-2 mb-4">
              {QUICK_ADMIN_QUERIES.map((q, i) => (
                <button key={i} onClick={() => setAdminQuery(q)}
                  className="text-xs font-bold px-3 py-1.5 bg-violet-50 text-violet-700 border border-violet-200 rounded-xl hover:bg-violet-100 transition-all">
                  {q}
                </button>
              ))}
            </div>

            {/* Query input */}
            <form onSubmit={askAdmin} className="flex gap-2 mb-4">
              <input
                value={adminQuery}
                onChange={e => setAdminQuery(e.target.value)}
                placeholder="Ask anything: bookings, revenue, analytics..."
                className="flex-1 text-sm font-medium bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-violet-400 transition-all"
                id="admin-ai-query"
              />
              <button type="submit" disabled={!adminQuery.trim() || adminLoading}
                className="px-5 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl font-black text-sm disabled:opacity-50 hover:opacity-90 transition-all shadow-lg shadow-violet-500/20">
                {adminLoading ? '...' : 'Ask'}
              </button>
            </form>

            {/* Reply */}
            {adminReply && (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Bot size={14} className="text-violet-500" />
                  <span className="text-xs font-black text-violet-600 uppercase tracking-wide">AI Response</span>
                </div>
                <p className="text-sm text-slate-700 font-medium leading-relaxed whitespace-pre-line">{adminReply}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Quick Navigation to Sub-Dashboards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { to: '/admin/ai/conversations', icon: MessageSquare, label: 'Conversation Center',   color: 'from-violet-500 to-indigo-600', sub: 'All chat sessions' },
            { to: '/admin/ai/voice',         icon: Phone,          label: 'Voice Call Dashboard', color: 'from-sky-500 to-blue-600',    sub: 'Inbound & outbound' },
            { to: '/admin/ai/knowledge',     icon: FileText,       label: 'Knowledge Base',       color: 'from-emerald-500 to-teal-600', sub: 'RAG documents' },
            { to: '/admin/ai/workflows',     icon: Workflow,       label: 'Workflow Builder',     color: 'from-amber-500 to-orange-600', sub: 'Automation engine' },
          ].map(item => (
            <Link key={item.to} to={item.to}
              className="group bg-white border border-slate-100 rounded-3xl p-5 hover:shadow-md transition-all flex flex-col gap-3">
              <div className={`w-12 h-12 bg-gradient-to-br ${item.color} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform`}>
                <item.icon size={22} className="text-white" />
              </div>
              <div>
                <p className="font-black text-slate-900 text-sm">{item.label}</p>
                <p className="text-[11px] text-slate-400 font-bold">{item.sub}</p>
              </div>
              <ChevronRight size={16} className="text-slate-300 group-hover:text-violet-500 group-hover:translate-x-1 transition-all" />
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}

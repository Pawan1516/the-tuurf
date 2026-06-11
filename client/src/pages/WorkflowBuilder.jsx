import React, { useState, useEffect } from 'react';
import { Workflow, Play, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw, ChevronRight, Zap, Settings } from 'lucide-react';

const API  = (p) => `/api/ai-platform${p}`;
const token = () => localStorage.getItem('token');

const CAT_COLORS = {
  bookings: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  users:    'bg-sky-50 text-sky-700 border-sky-200',
  support:  'bg-amber-50 text-amber-700 border-amber-200',
  payments: 'bg-violet-50 text-violet-700 border-violet-200',
  sales:    'bg-rose-50 text-rose-700 border-rose-200',
};

const STATUS_ICONS = {
  completed: <CheckCircle size={14} className="text-emerald-500" />,
  failed:    <XCircle size={14} className="text-red-500" />,
  running:   <RefreshCw size={14} className="text-sky-500 animate-spin" />,
  pending:   <Clock size={14} className="text-slate-400" />,
  cancelled: <AlertCircle size={14} className="text-amber-500" />,
};

function WorkflowCard({ workflow, onExecute, executing }) {
  const stepCount = workflow.steps?.length || 0;
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-black text-slate-900 text-sm leading-tight mb-1">{workflow.name}</h3>
          <p className="text-[11px] text-slate-400 leading-relaxed">{workflow.description}</p>
        </div>
        {workflow.category && (
          <span className={`flex-shrink-0 text-[10px] font-black px-2 py-1 rounded-xl border ml-3 ${CAT_COLORS[workflow.category] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
            {workflow.category}
          </span>
        )}
      </div>

      {/* Steps visualization */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto no-scrollbar">
        {(workflow.steps || []).slice(0, 4).map((step, i) => (
          <React.Fragment key={i}>
            <div className="flex-shrink-0 text-[10px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg whitespace-nowrap">
              {step.name || step.action}
            </div>
            {i < Math.min(stepCount, 4) - 1 && <ChevronRight size={10} className="text-slate-300 flex-shrink-0" />}
          </React.Fragment>
        ))}
        {stepCount > 4 && <span className="text-[10px] text-slate-400 font-bold flex-shrink-0">+{stepCount - 4} more</span>}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {stepCount} step{stepCount !== 1 ? 's' : ''} · {workflow.trigger}
          </span>
        </div>
        <button onClick={() => onExecute(workflow.id)} disabled={executing === workflow.id}
          className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-xs font-black disabled:opacity-50 hover:opacity-90 transition-all shadow-lg shadow-violet-500/20">
          {executing === workflow.id ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />}
          {executing === workflow.id ? 'Running...' : 'Run Now'}
        </button>
      </div>
    </div>
  );
}

function ExecutionHistoryRow({ exec }) {
  const statusIcon = STATUS_ICONS[exec.status] || STATUS_ICONS.pending;
  return (
    <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
      <td className="px-5 py-3">
        <p className="text-xs font-black text-slate-800">{exec.workflowName}</p>
        <p className="text-[10px] text-slate-400">{exec.workflowId}</p>
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center gap-1.5">
          {statusIcon}
          <span className="text-xs font-bold text-slate-700 capitalize">{exec.status}</span>
        </div>
      </td>
      <td className="px-5 py-3">
        <span className="text-[10px] font-bold text-slate-500 capitalize">{exec.triggeredBy}</span>
      </td>
      <td className="px-5 py-3">
        <span className="text-[10px] font-bold text-slate-500">{exec.duration ? `${exec.duration}ms` : '—'}</span>
      </td>
      <td className="px-5 py-3">
        <span className="text-[10px] text-slate-400">{new Date(exec.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>
      </td>
    </tr>
  );
}

export default function WorkflowBuilder() {
  const [workflows, setWorkflows]   = useState([]);
  const [history, setHistory]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [executing, setExecuting]   = useState(null);
  const [execResult, setExecResult] = useState(null);
  const [activeTab, setActiveTab]   = useState('workflows');

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token()}` };
      const [wfRes, histRes] = await Promise.all([
        fetch(API('/workflows'), { headers }),
        fetch(API('/workflows/history'), { headers }),
      ]);
      const [wfData, histData] = await Promise.all([wfRes.json(), histRes.json()]);
      if (wfData.success)   setWorkflows(wfData.workflows);
      if (histData.success) setHistory(histData.history);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const executeWorkflow = async (id) => {
    setExecuting(id); setExecResult(null);
    try {
      const res  = await fetch(API(`/workflows/${id}/execute`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setExecResult({ workflowId: id, ...data });
      setTimeout(fetchData, 1000);
    } catch (err) {
      setExecResult({ workflowId: id, success: false, error: err.message });
    } finally { setExecuting(null); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-amber-50/20 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Workflow size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">Workflow Automation</h1>
              <p className="text-sm text-slate-500 font-bold">{workflows.length} templates · {history.length} recent executions</p>
            </div>
          </div>
          <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* Execution result */}
        {execResult && (
          <div className={`flex items-start gap-3 p-4 rounded-2xl border ${execResult.success ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
            {execResult.success ? <CheckCircle size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" /> : <XCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />}
            <div>
              <p className={`text-sm font-black ${execResult.success ? 'text-emerald-700' : 'text-red-700'}`}>
                {execResult.success ? `✅ Workflow executed successfully in ${execResult.duration}ms` : `❌ Workflow failed: ${execResult.error}`}
              </p>
              {execResult.executionId && <p className="text-[11px] text-slate-500 mt-0.5">Execution ID: {execResult.executionId}</p>}
            </div>
            <button onClick={() => setExecResult(null)} className="ml-auto text-slate-400 hover:text-slate-600">✕</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
          {['workflows', 'history'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-xl text-sm font-black capitalize transition-all
                ${activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {tab === 'workflows' ? `Templates (${workflows.length})` : `History (${history.length})`}
            </button>
          ))}
        </div>

        {/* Workflow Cards */}
        {activeTab === 'workflows' && (
          loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
                  <div className="h-4 bg-slate-100 rounded mb-2" />
                  <div className="h-3 bg-slate-100 rounded w-3/4 mb-4" />
                  <div className="h-8 bg-slate-100 rounded-xl" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workflows.map(wf => (
                <WorkflowCard key={wf.id} workflow={wf} onExecute={executeWorkflow} executing={executing} />
              ))}
              {workflows.length === 0 && (
                <div className="col-span-3 text-center py-16">
                  <Workflow size={48} className="text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-500 font-bold">No workflows registered yet</p>
                  <p className="text-slate-400 text-sm mt-1">Workflows will appear here after the server initializes</p>
                </div>
              )}
            </div>
          )
        )}

        {/* History Table */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['Workflow', 'Status', 'Trigger', 'Duration', 'Time'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-12 text-slate-400 font-bold text-sm">No executions yet</td></tr>
                  ) : (
                    history.map(exec => <ExecutionHistoryRow key={exec._id} exec={exec} />)
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

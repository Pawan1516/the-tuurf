import React, { useState, useEffect } from 'react';
import { Search, Upload, Trash2, FileText, Tag, Clock, RefreshCw, BookOpen, Zap, X } from 'lucide-react';

const API  = (p) => `/api/ai-platform${p}`;
const token = () => localStorage.getItem('token');

const CATEGORIES = ['all', 'faq', 'policy', 'sop', 'product', 'training', 'general'];
const CAT_COLORS = {
  faq: 'bg-violet-50 text-violet-700 border-violet-200',
  policy: 'bg-sky-50 text-sky-700 border-sky-200',
  sop: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  product: 'bg-amber-50 text-amber-700 border-amber-200',
  training: 'bg-rose-50 text-rose-700 border-rose-200',
  general: 'bg-slate-50 text-slate-600 border-slate-200',
};

function DocCard({ doc, onDelete }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all group">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/20">
          <FileText size={16} className="text-white" />
        </div>
        <button onClick={() => onDelete(doc._id)}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-xl text-red-400 hover:bg-red-50 transition-all">
          <Trash2 size={14} />
        </button>
      </div>
      <h3 className="font-black text-slate-900 text-sm mb-1.5 leading-tight line-clamp-2">{doc.title}</h3>
      {doc.summary && <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-3">{doc.summary}</p>}
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${CAT_COLORS[doc.category] || CAT_COLORS.general}`}>
          {doc.category}
        </span>
        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
          <Clock size={10} />
          {new Date(doc.createdAt).toLocaleDateString('en-IN')}
        </div>
      </div>
      {doc.tags && doc.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {doc.tags.slice(0, 3).map(t => (
            <span key={t} className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-md">#{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function UploadModal({ onClose, onSuccess }) {
  const [form, setForm]     = useState({ title: '', category: 'general', tags: '' });
  const [file, setFile]     = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError]   = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!file) { setError('Please select a file'); return; }
    setUploading(true); setError('');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('title', form.title || file.name);
    fd.append('category', form.category);
    fd.append('tags', form.tags);
    try {
      const res  = await fetch(API('/knowledge/upload'), { method: 'POST', headers: { Authorization: `Bearer ${token()}` }, body: fd });
      const data = await res.json();
      if (data.success) { onSuccess(); onClose(); }
      else setError(data.error || 'Upload failed');
    } catch (err) { setError(err.message); } finally { setUploading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Upload size={16} className="text-white" />
            </div>
            <h2 className="font-black text-slate-900">Upload Document</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-all"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1.5">File (PDF, TXT, MD, DOCX)</label>
            <input type="file" accept=".pdf,.txt,.md,.docx" onChange={e => setFile(e.target.files[0])}
              className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:font-black file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 transition-all" />
          </div>
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1.5">Title</label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Document title (optional)"
              className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-violet-400 transition-all" />
          </div>
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1.5">Category</label>
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-violet-400 transition-all">
              {CATEGORIES.filter(c => c !== 'all').map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1.5">Tags (comma-separated)</label>
            <input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))}
              placeholder="booking, policy, faq"
              className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-violet-400 transition-all" />
          </div>
          {error && <p className="text-xs text-red-500 font-bold bg-red-50 px-3 py-2 rounded-xl">{error}</p>}
          <button type="submit" disabled={uploading}
            className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-black text-sm disabled:opacity-50 hover:opacity-90 transition-all shadow-lg shadow-violet-500/20">
            {uploading ? 'Uploading & Embedding...' : 'Upload & Train AI'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function KnowledgeBaseManager() {
  const [docs, setDocs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [category, setCategory] = useState('all');
  const [total, setTotal]       = useState(0);
  const [showUpload, setShowUpload] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: 1, limit: 20 });
      if (category !== 'all') params.set('category', category);
      const res  = await fetch(`${API('/knowledge')}?${params}`, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      if (data.success) { setDocs(data.docs); setTotal(data.total); }
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { fetchDocs(); }, [category]); // eslint-disable-line

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this document?')) return;
    await fetch(API(`/knowledge/${id}`), { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
    fetchDocs();
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) { setSearchResults(null); return; }
    setSearching(true);
    try {
      const res  = await fetch(API('/knowledge/search'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ query: searchQuery, topK: 5 }),
      });
      const data = await res.json();
      setSearchResults(data.docs || []);
    } catch { } finally { setSearching(false); }
  };

  const displayDocs = searchResults !== null ? searchResults : docs;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50/20 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/30">
              <BookOpen size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">Knowledge Base</h1>
              <p className="text-sm text-slate-500 font-bold">{total} documents · RAG-powered semantic search</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchDocs} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-black shadow-lg shadow-violet-500/30 hover:opacity-90 transition-all">
              <Upload size={14} /> Upload Document
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1 flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-5 py-3 focus-within:border-violet-400 transition-all shadow-sm">
            <Search size={16} className="text-slate-400 flex-shrink-0" />
            <input
              value={searchQuery} onChange={e => { setSearchQuery(e.target.value); if (!e.target.value) setSearchResults(null); }}
              placeholder="Semantic search: 'What is the refund policy?' or 'booking procedures'..."
              className="flex-1 text-sm font-medium text-slate-800 placeholder-slate-400 outline-none bg-transparent"
              id="kb-search" />
            {searchResults && (
              <button type="button" onClick={() => { setSearchResults(null); setSearchQuery(''); }} className="text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
          </div>
          <button type="submit" disabled={searching}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl font-black text-sm disabled:opacity-50 hover:opacity-90 transition-all shadow-lg shadow-violet-500/20">
            <Zap size={14} /> {searching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* Category Filters */}
        {!searchResults && (
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className={`flex-shrink-0 text-xs font-black px-4 py-2 rounded-xl capitalize transition-all
                  ${category === c ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {c === 'all' ? `All (${total})` : c}
              </button>
            ))}
          </div>
        )}

        {/* Search result header */}
        {searchResults && (
          <div className="flex items-center gap-2 px-4 py-2 bg-violet-50 border border-violet-100 rounded-2xl">
            <Zap size={14} className="text-violet-500" />
            <p className="text-sm font-bold text-violet-700">
              Showing {searchResults.length} semantic results for "{searchQuery}"
            </p>
          </div>
        )}

        {/* Documents Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1,2,3,4,5,6,7,8].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 animate-pulse">
                <div className="w-9 h-9 bg-slate-100 rounded-xl mb-3" />
                <div className="h-4 bg-slate-100 rounded-lg mb-2" />
                <div className="h-3 bg-slate-100 rounded-lg w-2/3" />
              </div>
            ))}
          </div>
        ) : displayDocs.length === 0 ? (
          <div className="text-center py-20">
            <FileText size={48} className="text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-bold text-lg">No documents found</p>
            <p className="text-slate-400 text-sm mt-1">Upload your first document to train the AI</p>
            <button onClick={() => setShowUpload(true)} className="mt-4 px-5 py-2.5 bg-violet-600 text-white rounded-xl font-black text-sm hover:bg-violet-700 transition-all">
              Upload Document
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {displayDocs.map(doc => <DocCard key={doc._id} doc={doc} onDelete={handleDelete} />)}
          </div>
        )}
      </div>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onSuccess={fetchDocs} />}
    </div>
  );
}

import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import { bookingsAPI } from '../../api/client';
import { Download, ArrowLeft, FileText, Database, Table, ShieldCheck, FileSpreadsheet } from 'lucide-react';

const WorkerReport = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (format = 'csv') => {
    setDownloading(true);

    try {
      const response = format === 'pdf'
        ? await bookingsAPI.downloadPDFReport()
        : await bookingsAPI.downloadReport();

      const blob = new Blob([response.data], { type: format === 'pdf' ? 'application/pdf' : 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `booking-report-${new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 font-sans selection:bg-emerald-500/30">
      {/* Premium Header */}
      <div className="bg-slate-950 pt-24 pb-48 px-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
        <div className="max-w-6xl mx-auto relative z-10">
          <button 
            onClick={() => navigate(-1)}
            className="bg-white/5 hover:bg-white/10 text-blue-100/60 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all mb-10 outline-none border border-white/5"
          >
            <ArrowLeft size={16} /> Back to Terminal
          </button>
          <h2 className="text-5xl font-black text-white tracking-tighter uppercase leading-none mb-4 italic">
            Operations <span className="text-emerald-500 italic">Intelligence</span>
          </h2>
          <p className="text-slate-400 font-bold uppercase text-[11px] tracking-[0.2em]">Generate and extract ground-level booking data</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-24 relative z-20">
        <div className="grid md:grid-cols-2 gap-10">
          {/* CSV Report */}
          <div className="bg-white rounded-[3rem] shadow-2xl shadow-blue-900/[0.03] border border-slate-100 p-12 flex flex-col items-center text-center group translate-y-0 hover:-translate-y-2 transition-all duration-500">
            <div className="bg-blue-50 w-24 h-24 rounded-[2rem] flex items-center justify-center mb-10 text-emerald-600 transition-all group-hover:bg-emerald-600 group-hover:text-white group-hover:rotate-6 shadow-xl shadow-blue-900/5">
              <FileSpreadsheet size={40} strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-4 uppercase tracking-tight italic">Structured <span className="text-emerald-600">CSV</span></h3>
            <p className="text-slate-500 text-sm font-bold leading-relaxed mb-10 tracking-tight">
              Detailed raw data of all bookings, payments, and player details optimized for spreadsheet analysis.
            </p>
            <button 
              onClick={() => handleDownload('csv')}
              disabled={downloading}
              className="w-full bg-emerald-600 text-white py-6 rounded-[2rem] font-black uppercase text-[11px] tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-slate-900 transition-all shadow-2xl shadow-emerald-500/20 outline-none active:scale-95"
            >
              <Download size={18} /> {downloading ? 'Processing...' : 'Export CSV Protocol'}
            </button>
          </div>

          {/* PDF Report */}
          <div className="bg-white rounded-[3rem] shadow-2xl shadow-blue-900/[0.03] border border-slate-100 p-12 flex flex-col items-center text-center group translate-y-0 hover:-translate-y-2 transition-all duration-500">
            <div className="bg-indigo-50 w-24 h-24 rounded-[2rem] flex items-center justify-center mb-10 text-emerald-600 transition-all group-hover:bg-emerald-600 group-hover:text-white group-hover:-rotate-6 shadow-xl shadow-indigo-900/5">
              <FileText size={40} strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-4 uppercase tracking-tight italic">Official <span className="text-emerald-600">PDF</span></h3>
            <p className="text-slate-500 text-sm font-bold leading-relaxed mb-10 tracking-tight">
              Professional visual summary of revenue, occupancy, and match metrics ready for stakeholder presentation.
            </p>
            <button 
              onClick={() => handleDownload('pdf')}
              disabled={downloading}
              className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black uppercase text-[11px] tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-emerald-600 transition-all shadow-2xl shadow-slate-900/10 outline-none active:scale-95"
            >
              <Download size={18} /> {downloading ? 'Compiling...' : 'Generate PDF Hub'}
            </button>
          </div>
        </div>

        {/* Info Card */}
        <div className="mt-12 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-blue-900/[0.02] p-12 overflow-hidden relative group">
           <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 blur-[60px] rounded-full group-hover:bg-emerald-500/10 transition-all duration-700"></div>
           <div className="flex flex-col md:flex-row gap-10 relative z-10">
            <div className="flex-1">
              <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mb-6 flex items-center gap-3 italic">
                <ShieldCheck size={18} /> Data Integrity Details
              </h4>
              <p className="text-slate-500 text-sm font-bold leading-relaxed mb-8 tracking-tight italic">
                All generated reports include synchronized transaction IDs, player verification status, and timestamped ground activity logs. 
                Reports are cryptographically verified for accounting accuracy.
              </p>
              <div className="grid grid-cols-2 gap-6">
                {['Sync ID: OPER-X81', 'Node: HYD-01', 'Auth: ADM-LVL-1', 'State: STABLE'].map(item => (
                   <div key={item} className="flex items-center gap-3">
                     <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                     <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{item}</span>
                   </div>
                ))}
              </div>
            </div>
            <div className="md:w-72 bg-slate-50 p-8 rounded-[2rem] border border-slate-100 shadow-inner">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-6 italic">Worker Context</p>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Operator</span>
                  <span className="font-black text-slate-900 text-[11px] uppercase italic">{user?.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Access</span>
                  <span className="font-mono text-emerald-600 text-[10px] font-black tracking-tighter">ADM_GROUND_OPS</span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                   <span className="text-[9px] font-black text-slate-400 uppercase">Live Pulse</span>
                   <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                      <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Active</span>
                   </div>
                </div>
              </div>
            </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerReport;

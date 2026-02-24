import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import { bookingsAPI } from '../../api/client';
import { Download, ArrowLeft, FileText, Database, Table, ShieldCheck } from 'lucide-react';

const WorkerReport = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadReport = async (format = 'csv') => {
    setDownloading(true);

    try {
      const response = format === 'pdf'
        ? await bookingsAPI.downloadPDFReport()
        : await bookingsAPI.downloadReport();

      const blob = new Blob([response.data], { type: format === 'pdf' ? 'application/pdf' : 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `booking-report-${new Date().toISOString().split('T')[0]}.${format}`);
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-emerald-900 pt-20 pb-40 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-400 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
        </div>

        <div className="max-w-4xl mx-auto relative z-10">
          <button
            onClick={() => navigate('/worker/dashboard')}
            className="bg-white/10 hover:bg-white/20 text-emerald-100 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all mb-8 outline-none"
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
          <h2 className="text-5xl font-black text-white tracking-tight uppercase leading-tight mb-4">Operations <span className="text-emerald-400 italic">Intelligence</span></h2>
          <p className="text-emerald-100/60 font-bold uppercase text-xs tracking-[0.2em]">Generate and extract ground-level booking data</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 -mt-24 relative z-20 mb-20 w-full">
        <div className="grid md:grid-cols-2 gap-8">

          {/* CSV Download Card */}
          <div className="bg-white rounded-[3rem] shadow-2xl shadow-emerald-900/5 border border-gray-100 p-10 flex flex-col items-center text-center group translate-y-0 hover:-translate-y-2 transition-transform duration-500">
            <div className="bg-emerald-50 w-24 h-24 rounded-3xl flex items-center justify-center mb-8 text-emerald-600 transition-all group-hover:bg-emerald-600 group-hover:text-white group-hover:rotate-6 shadow-xl shadow-emerald-900/5">
              <Table size={40} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-4 uppercase tracking-tight">Structured <span className="text-emerald-600">CSV</span></h3>
            <p className="text-gray-400 text-sm font-medium leading-relaxed mb-10">
              Download raw assignment data optimized for ground operations analysis, spreadsheet auditing, and manual verification.
            </p>
            <button
              onClick={() => handleDownloadReport('csv')}
              disabled={downloading}
              className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 outline-none"
            >
              <Download size={20} />
              {downloading ? 'Processing Architecture...' : 'Generate CSV Matrix'}
            </button>
          </div>

          {/* PDF Download Card */}
          <div className="bg-white rounded-[3rem] shadow-2xl shadow-emerald-900/5 border border-gray-100 p-10 flex flex-col items-center text-center group translate-y-0 hover:-translate-y-2 transition-transform duration-500">
            <div className="bg-emerald-50 w-24 h-24 rounded-3xl flex items-center justify-center mb-8 text-emerald-600 transition-all group-hover:bg-emerald-600 group-hover:text-white group-hover:rotate-6 shadow-xl shadow-emerald-900/5">
              <FileText size={40} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-4 uppercase tracking-tight">Official <span className="text-emerald-600">PDF</span></h3>
            <p className="text-gray-400 text-sm font-medium leading-relaxed mb-10">
              Generate formatted printable booking vouchers and summary PDFs for official record keeping and verification.
            </p>
            <button
              onClick={() => handleDownloadReport('pdf')}
              disabled={downloading}
              className="w-full bg-emerald-900 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-black transition-all shadow-lg shadow-emerald-200 outline-none"
            >
              <Download size={20} />
              {downloading ? 'Compiling Dossier...' : 'Download PDF Report'}
            </button>
          </div>
        </div>

        {/* Audit Information */}
        <div className="mt-12 bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-emerald-900/5 p-10 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-5 text-gray-900 pointer-events-none">
            <Database size={120} />
          </div>

          <h4 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
            <ShieldCheck size={18} className="text-emerald-600" /> Data Integrity Details
          </h4>

          <div className="grid md:grid-cols-2 gap-10">
            <div className="space-y-4">
              {[
                'Universal unique Booking IDs',
                'Full customer contact matrices',
                'Granular 30-min slot segments',
                'Real-time financial status tracking'
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm font-bold text-gray-600">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                  {item}
                </div>
              ))}
            </div>
            <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100">
              <p className="text-[10px] font-black text-emerald-800/40 uppercase tracking-widest mb-4">Worker Context</p>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-500 uppercase tracking-widest">Operator:</span>
                  <span className="font-black text-emerald-900">{user?.name}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-500 uppercase tracking-widest">ID:</span>
                  <span className="font-mono text-emerald-900 opacity-60">ADMIN_GROUND_OPS</span>
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

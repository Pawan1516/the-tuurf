import React, { useState, useContext } from 'react';
import AdminSidebar from './AdminSidebar';
import AuthContext from '../context/AuthContext';
import { BarChart3, Download } from 'lucide-react';

const AdminLayout = ({ children, title = 'Admin', subtitle = '' }) => {
  const { user, logout } = useContext(AuthContext);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex font-sans selection:bg-emerald-600/20">
      <AdminSidebar user={user} logout={logout} mobileOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />
      <main className="flex-1 overflow-y-auto pb-24 relative custom-scrollbar">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-[40] px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4 min-w-0">
            <button onClick={() => setMobileSidebarOpen(true)} className="lg:hidden p-2 mr-2 bg-slate-50 rounded-md">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600"><path d="M3 12h18M3 6h18M3 18h18"></path></svg>
            </button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3 truncate">
                <BarChart3 className="text-emerald-600" size={20} />
                <span className="truncate">{title}</span>
                <span className="hidden sm:inline text-slate-400 font-normal">{subtitle}</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 bg-emerald-600 text-white rounded-xl shadow hover:opacity-95">
              <Download size={16} />
            </button>
          </div>
        </header>

        <div className="max-w-[1600px] mx-auto p-4 sm:p-10 space-y-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;

import React, { useState, useEffect } from 'react';
import AdminSidebar from '../components/AdminSidebar';
import AdminMetrics from '../components/AdminMetrics';
import UserManagement from '../components/UserManagement';
import BookingManagement from '../components/BookingManagement';
import RevenueReports from '../components/RevenueReports';
import { api } from '../services/api';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/analytics/dashboard');
      setMetrics(res.data.data);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {activeTab === 'dashboard' && metrics && (
            <AdminMetrics metrics={metrics} />
          )}
          
          {activeTab === 'users' && <UserManagement />}
          
          {activeTab === 'bookings' && <BookingManagement />}
          
          {activeTab === 'revenue' && <RevenueReports />}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

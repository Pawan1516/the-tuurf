import { createContext, useState, useEffect, useCallback } from 'react';
import apiClient, { authAPI, setAccessToken } from '../api/client';
import { requestNotificationPermission } from '../utils/notifications';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem('user');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // ─── Silent Refresh on Load ──────────────────────────────────────────────
  const refreshSession = useCallback(async () => {
    try {
      const res = await authAPI.getProfile(); // This will trigger interceptor which calls /refresh if needed
      if (res.data.success) {
        setUser(res.data.user);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        requestNotificationPermission(res.data.user.id || res.data.user._id);
      }
    } catch (err) {
      console.log('No active session found.');
      setUser(null);
      localStorage.removeItem('user');
      setAccessToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  // ─── Unified Login (Supports Player, Admin, Worker) ───────────────────────
  const login = async (email, password, adminKey = null) => {
    try {
      const res = await authAPI.login(email, password, adminKey);
      if (res.data.success) {
        setAccessToken(res.data.token);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setUser(res.data.user);
        requestNotificationPermission(res.data.user.id || res.data.user._id);
        return { success: true, user: res.data.user };
      }
      return { success: false, message: res.data.message || 'Login failed.' };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Authentication signature invalid.' };
    }
  };

  const quickLogin = async (mobile, name) => {
    try {
      const res = await authAPI.quickLogin(mobile, name);
      if (res.data.success) {
        setAccessToken(res.data.token);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setUser(res.data.user);
        requestNotificationPermission(res.data.user.id || res.data.user._id);
        return { success: true, user: res.data.user };
      }
      return { success: false, message: res.data.message || 'Quick login failed.' };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Quick login failed.' };
    }
  };

  // ─── Step 1: Send OTP to email ────────────────────────────────────────────
  const sendRegisterOTP = async (email) => {
    try {
      await authAPI.sendRegisterOTP(email);
      return { success: true };
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Failed to send OTP.';
      return { success: false, message: msg };
    }
  };

  // ─── Step 2: Verify OTP + Create account ─────────────────────────────────
  const verifyRegistration = async (data) => {
    try {
      const res = await authAPI.verifyRegistration(data);
      setAccessToken(res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setUser(res.data.user);
      return { success: true, user: res.data.user };
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Verification failed.';
      return { success: false, message: msg };
    }
  };

  // ─── Logout ───────────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      console.error('Remote logout failed, clearing local state.');
    } finally {
      localStorage.removeItem('user');
      setAccessToken(null);
      setUser(null);
      delete apiClient.defaults.headers.common['Authorization'];
    }
  };

  return (
    <AuthContext.Provider value={{
      user, login, quickLogin, logout, loading,
      sendRegisterOTP, verifyRegistration,
      refreshSession
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;




import { createContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import apiClient, { authAPI, setAccessToken, API_BASE_URL } from '../api/client';
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
    if (!localStorage.getItem('user')) {
      setLoading(false);
      return;
    }
    try {
      // Step 1: Silently exchange the refreshToken cookie for a new access token.
      // Doing this explicitly first prevents the axios interceptor from firing
      // its own /auth/refresh call during getProfile, which caused the 401 console noise.
      const refreshRes = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true }
      );
      if (refreshRes.data?.success && refreshRes.data?.token) {
        setAccessToken(refreshRes.data.token);
      } else {
        // Refresh succeeded HTTP-wise but returned no token — treat as expired
        throw new Error('No token in refresh response');
      }

      // Step 2: Now fetch the profile (token is in memory, no 401 expected)
      const res = await authAPI.getProfile();
      if (res.data.success) {
        setUser(res.data.user);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        requestNotificationPermission(res.data.user.id || res.data.user._id);
      }
    } catch (err) {
      // Refresh or profile failed — session is gone, clear state silently
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




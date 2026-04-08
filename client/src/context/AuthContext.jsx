import { createContext, useState, useEffect } from 'react';
import { authAPI } from '../api/client';
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
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
    if (user) {
      requestNotificationPermission(user.id || user._id);
    }
  }, [token, user]);

  // ─── Unified Login (Supports Player, Admin, Worker) ───────────────────────
  const login = async (email, password) => {
    try {
      const res = await authAPI.login(email, password);
      if (res.data.success) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setToken(res.data.token);
        setUser(res.data.user);
        return { success: true, user: res.data.user };
      }
      return { success: false, message: res.data.message || 'Login failed.' };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Authentication signature invalid.' };
    }
  };

  // ─── Step 1: Send OTP to email ────────────────────────────────────────────
  const sendRegisterOTP = async (email) => {
    try {
      const res = await authAPI.sendRegisterOTP(email);
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
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setToken(res.data.token);
      setUser(res.data.user);
      return { success: true, user: res.data.user };
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Verification failed.';
      console.error('[AUTH] verifyRegistration error:', msg, error.response?.data);
      return { success: false, message: msg };
    }
  };

  // ─── Logout ───────────────────────────────────────────────────────────────
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{
      user, token, login, logout, loading,
      sendRegisterOTP, verifyRegistration
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;

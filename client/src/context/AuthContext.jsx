import { createContext, useState, useEffect } from 'react';
import { authAPI } from '../api/client';
import { auth } from '../firebase';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem('user');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      console.error('Error parsing user from localStorage:', error);
      return null;
    }
  });
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [confirmationResult, setConfirmationResult] = useState(null);

  useEffect(() => {
    setLoading(false);
  }, [token]);

  const login = async (role, email, password, requestedRole, phone) => {
    try {
      const res = await authAPI.login(email, password, requestedRole || role, phone);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setToken(res.data.token);
      setUser(res.data.user);
      return { success: true, user: res.data.user };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Login failed' };
    }
  };

  const loginWithGoogle = async (email, name, uid) => {
    try {
      const res = await authAPI.googleLogin(email, name, uid);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setToken(res.data.token);
      setUser(res.data.user);
      return { success: true, user: res.data.user };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Google Authentication Framework failed' };
    }
  };

  const register = async (name, email, phone, password) => {
    try {
      const res = await authAPI.register(name, email, phone, password);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setToken(res.data.token);
      setUser(res.data.user);
      return { success: true, user: res.data.user };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Registration failed' };
    }
  };

  const sendFirebaseOTP = async (phoneNumber, containerId) => {
    try {
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
          'size': 'invisible',
          'callback': (response) => {
            console.log('Recaptcha resolved:', response);
          }
        });
      }
      
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, window.recaptchaVerifier);
      setConfirmationResult(confirmation);
      return { success: true };
    } catch (error) {
      console.error('Firebase Auth Error:', error);
      return { success: false, message: error.message };
    }
  };

  const verifyFirebaseOTP = async (code) => {
    try {
      if (!confirmationResult) throw new Error('Session Expired. Resend code.');
      const result = await confirmationResult.confirm(code);
      const fbUser = result.user;
      const idToken = await fbUser.getIdToken();
      
      // Transmit to backend to get JWT and user record
      const res = await authAPI.verifyOTP(fbUser.phoneNumber.replace('+91', ''), idToken);
      
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setToken(res.data.token);
      setUser(res.data.user);
      return { success: true, user: res.data.user };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, loginWithGoogle, logout, loading, sendFirebaseOTP, verifyFirebaseOTP }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;

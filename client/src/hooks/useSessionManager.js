import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api/client';

/**
 * useSessionManager Hook
 * Manages auto-logout after 1 hour of inactivity
 * Syncs with backend session service
 * Displays warning 5 minutes before logout
 */
export const useSessionManager = () => {
  const [isSessionActive, setIsSessionActive] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(60 * 60 * 1000); // 1 hour
  const [showWarning, setShowWarning] = useState(false);
  const navigate = useNavigate();

  const timersRef = useRef({
    logoutTimer: null,
    warningTimer: null,
    countdownInterval: null,
    statusCheckInterval: null,
    activityDebounce: null
  });

  const authChannelRef = useRef(new BroadcastChannel('auth_session'));
  const lastActivityRef = useRef(Date.now());

  // Calculate timeout and warning times from backend config
  const TIMEOUT_DURATION = 60 * 60 * 1000; // 1 hour
  const WARNING_TIME = 55 * 60 * 1000; // 5 minutes before logout
  const STATUS_CHECK_INTERVAL = 30 * 1000; // Check status every 30 seconds
  const ACTIVITY_DEBOUNCE_TIME = 5 * 1000; // Debounce activity for 5 seconds

  /**
   * Call server to refresh session and reset activity timer
   */
  const resetActivityTimer = useCallback(async () => {
    try {
      const response = await authAPI.post('/auth/keep-alive');
      
      if (response.data?.success) {
        lastActivityRef.current = Date.now();
        setTimeRemaining(response.data.remainingTime || TIMEOUT_DURATION);
        setShowWarning(false);

        // Clear existing timers
        Object.values(timersRef.current).forEach(timer => {
          if (timer) {
            if (typeof timer === 'number') {
              clearTimeout(timer);
              clearInterval(timer);
            }
          }
        });

        // Set warning timer (55 minutes from now)
        timersRef.current.warningTimer = setTimeout(() => {
          setShowWarning(true);
          startCountdown();
        }, WARNING_TIME);

        // Set logout timer (1 hour from now)
        timersRef.current.logoutTimer = setTimeout(() => {
          handleAutoLogout();
        }, TIMEOUT_DURATION);
      } else {
        handleAutoLogout();
      }
    } catch (error) {
      console.warn('Failed to reset activity timer:', error.message);
      // Don't logout on error, just log it
    }
  }, []);

  /**
   * Auto logout handler
   */
  const handleAutoLogout = useCallback(async () => {
    try {
      await authAPI.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setIsSessionActive(false);
      setShowWarning(false);

      // Notify other tabs
      try {
        authChannelRef.current.postMessage({ type: 'SESSION_EXPIRED' });
      } catch (e) {
        console.warn('Failed to notify other tabs:', e);
      }

      // Redirect to login
      navigate('/login?expired=true');
      window.location.reload();
    }
  }, [navigate]);

  /**
   * Start countdown timer for warning modal
   */
  const startCountdown = () => {
    let countdown = WARNING_TIME / 1000; // Convert to seconds
    
    timersRef.current.countdownInterval = setInterval(() => {
      countdown--;
      setTimeRemaining(countdown * 1000);

      if (countdown <= 0) {
        clearInterval(timersRef.current.countdownInterval);
      }
    }, 1000);
  };

  /**
   * Check session status with server
   */
  const checkSessionStatus = useCallback(async () => {
    try {
      const response = await authAPI.get('/auth/session-status');
      
      if (response.data?.authenticated === false) {
        handleAutoLogout();
      } else if (response.data?.remainingTime !== undefined) {
        setTimeRemaining(response.data.remainingTime);
      }
    } catch (error) {
      console.warn('Session status check failed:', error.message);
    }
  }, [handleAutoLogout]);

  /**
   * Handle user activity with debouncing
   */
  const handleActivity = useCallback(() => {
    const now = Date.now();
    
    // Debounce activity calls
    if (now - lastActivityRef.current < ACTIVITY_DEBOUNCE_TIME) {
      return;
    }

    // Don't reset while warning modal is showing
    if (showWarning) {
      return;
    }

    lastActivityRef.current = now;
    resetActivityTimer();
  }, [showWarning, resetActivityTimer]);

  /**
   * Initialize session management
   */
  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      setIsSessionActive(false);
      return;
    }

    setIsSessionActive(true);

    // Activity event listeners
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    // Initialize session
    resetActivityTimer();

    // Check session status periodically
    timersRef.current.statusCheckInterval = setInterval(checkSessionStatus, STATUS_CHECK_INTERVAL);

    // Listen for logout from other tabs
    authChannelRef.current.onmessage = (event) => {
      if (event.data.type === 'SESSION_EXPIRED') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsSessionActive(false);
        navigate('/login?expired=true');
        window.location.reload();
      }
    };

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });

      Object.values(timersRef.current).forEach(timer => {
        if (timer) {
          clearTimeout(timer);
          clearInterval(timer);
        }
      });

      try {
        authChannelRef.current.close();
      } catch (e) {
        console.warn('Failed to close auth channel:', e);
      }
    };
  }, [handleActivity, resetActivityTimer, checkSessionStatus, navigate]);

  return {
    isSessionActive,
    timeRemaining,
    showWarning,
    handleAutoLogout,
    resetActivityTimer
  };
};

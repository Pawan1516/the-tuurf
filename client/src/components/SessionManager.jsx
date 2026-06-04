import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api/client';
import SessionWarningModal from './SessionWarningModal';

const SessionManager = ({ children }) => {
    const [showWarning, setShowWarning] = useState(false);
    const [timeLeft, setTimeLeft] = useState(300); // 5 minutes warning
    const navigate = useNavigate();
    
    // BroadcastChannel for multi-tab logout synchronization
    const authChannel = useRef(new BroadcastChannel('auth_sync'));
    
    const SESSION_TIMEOUT = 60 * 60 * 1000; // 1 hour
    const WARNING_THRESHOLD = 5 * 60 * 1000; // 5 minutes
    
    const logoutTimer = useRef(null);
    const warningTimer = useRef(null);
    const countdownInterval = useRef(null);

    const handleLogout = useCallback(async (isAuto = true) => {
        try {
            await authAPI.logout();
        } catch (err) {
            console.error('Logout error:', err);
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            // Sync logout to other tabs
            authChannel.current.postMessage({ type: 'LOGOUT' });
            
            navigate(`/login${isAuto ? '?expired=true' : ''}`);
            window.location.reload(); // Hard reset state
        }
    }, [navigate]);

    const resetTimers = useCallback(() => {
        if (logoutTimer.current) clearTimeout(logoutTimer.current);
        if (warningTimer.current) clearTimeout(warningTimer.current);
        if (countdownInterval.current) clearInterval(countdownInterval.current);

        setShowWarning(false);
        setTimeLeft(300);

        // Don't set timers if user not logged in
        if (!localStorage.getItem('token')) return;

        // Set main logout timer
        logoutTimer.current = setTimeout(() => {
            handleLogout(true);
        }, SESSION_TIMEOUT);

        // Set warning timer (1 hour - 5 minutes)
        warningTimer.current = setTimeout(() => {
            setShowWarning(true);
            startCountdown();
        }, SESSION_TIMEOUT - WARNING_THRESHOLD);

    }, [handleLogout]);

    const startCountdown = () => {
        countdownInterval.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(countdownInterval.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleStayLoggedIn = async () => {
        try {
            // Ping server to rotate token and extend session
            await authAPI.getProfile(); 
            resetTimers();
        } catch (err) {
            handleLogout(true);
        }
    };

    useEffect(() => {
        // Activity tracking
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        const activityHandler = () => {
            // Only reset if modal is NOT showing
            if (!showWarning) {
                resetTimers();
            }
        };

        events.forEach(event => window.addEventListener(event, activityHandler));
        resetTimers();

        // Listen for logout from other tabs
        authChannel.current.onmessage = (event) => {
            if (event.data.type === 'LOGOUT') {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                navigate('/login');
                window.location.reload();
            }
        };

        return () => {
            events.forEach(event => window.removeEventListener(event, activityHandler));
            if (logoutTimer.current) clearTimeout(logoutTimer.current);
            if (warningTimer.current) clearTimeout(warningTimer.current);
            if (countdownInterval.current) clearInterval(countdownInterval.current);
            authChannel.current.close();
        };
    }, [resetTimers, showWarning, navigate]);

    return (
        <>
            {children}
            <SessionWarningModal 
                isOpen={showWarning}
                timeLeft={timeLeft}
                onStay={handleStayLoggedIn}
                onLogout={() => handleLogout(false)}
            />
        </>
    );
};

export default SessionManager;

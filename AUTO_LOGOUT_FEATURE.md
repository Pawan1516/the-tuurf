# 🔐 Auto Logout Implementation Guide

## Overview
Automatic logout feature to enhance security by logging out inactive users from their profiles.

---

## 1. Backend Implementation

### Session Timeout Configuration

```javascript
// config/sessionConfig.js
const SESSION_CONFIG = {
  // Inactivity timeout (15 minutes)
  INACTIVITY_TIMEOUT: 15 * 60 * 1000, // milliseconds
  
  // Session warning (show alert at 12 minutes)
  WARNING_TIME: 12 * 60 * 1000,
  
  // Hard logout time (15 minutes)
  HARD_LOGOUT_TIME: 15 * 60 * 1000,
  
  // Check interval (every 1 minute)
  CHECK_INTERVAL: 1 * 60 * 1000,
  
  // Remember me duration (7 days)
  REMEMBER_ME_DURATION: 7 * 24 * 60 * 60 * 1000,
  
  // Permanent session (admin/staff)
  ADMIN_TIMEOUT: 30 * 60 * 1000 // 30 minutes
};

module.exports = SESSION_CONFIG;
```

### Session Management Service

```javascript
// services/sessionService.js
const jwt = require('jsonwebtoken');
const redis = require('redis');
const SESSION_CONFIG = require('../config/sessionConfig');

class SessionService {
  constructor() {
    this.client = redis.createClient();
    this.sessionPrefix = 'session:';
  }

  // Create session
  async createSession(userId, payload) {
    const sessionId = generateUniqueId();
    const sessionData = {
      userId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      userAgent: payload.userAgent,
      ipAddress: payload.ipAddress,
      rememberMe: payload.rememberMe || false,
      ...payload
    };

    const timeout = payload.rememberMe 
      ? SESSION_CONFIG.REMEMBER_ME_DURATION 
      : SESSION_CONFIG.INACTIVITY_TIMEOUT;

    await this.client.setex(
      `${this.sessionPrefix}${sessionId}`,
      Math.floor(timeout / 1000),
      JSON.stringify(sessionData)
    );

    return sessionId;
  }

  // Update last activity
  async updateActivity(sessionId) {
    const key = `${this.sessionPrefix}${sessionId}`;
    const sessionData = await this.client.get(key);
    
    if (sessionData) {
      const data = JSON.parse(sessionData);
      data.lastActivity = Date.now();
      
      // Reset TTL
      const timeout = data.rememberMe 
        ? SESSION_CONFIG.REMEMBER_ME_DURATION 
        : SESSION_CONFIG.INACTIVITY_TIMEOUT;
      
      await this.client.setex(
        key,
        Math.floor(timeout / 1000),
        JSON.stringify(data)
      );
      return true;
    }
    return false;
  }

  // Get session
  async getSession(sessionId) {
    const sessionData = await this.client.get(`${this.sessionPrefix}${sessionId}`);
    return sessionData ? JSON.parse(sessionData) : null;
  }

  // Check if session expired
  async isSessionValid(sessionId) {
    const session = await this.getSession(sessionId);
    if (!session) return false;

    const now = Date.now();
    const timeSinceLastActivity = now - session.lastActivity;
    const timeout = session.rememberMe 
      ? SESSION_CONFIG.REMEMBER_ME_DURATION 
      : SESSION_CONFIG.INACTIVITY_TIMEOUT;

    return timeSinceLastActivity < timeout;
  }

  // Get remaining time
  async getRemainingTime(sessionId) {
    const session = await this.getSession(sessionId);
    if (!session) return 0;

    const now = Date.now();
    const timeSinceLastActivity = now - session.lastActivity;
    const timeout = session.rememberMe 
      ? SESSION_CONFIG.REMEMBER_ME_DURATION 
      : SESSION_CONFIG.INACTIVITY_TIMEOUT;

    return Math.max(0, timeout - timeSinceLastActivity);
  }

  // Destroy session
  async destroySession(sessionId) {
    const key = `${this.sessionPrefix}${sessionId}`;
    await this.client.del(key);
    return true;
  }

  // Cleanup expired sessions
  async cleanupExpiredSessions() {
    // Redis handles this automatically with TTL
    return true;
  }
}

module.exports = new SessionService();
```

### Middleware - Activity Tracker

```javascript
// middleware/activityTracker.js
const sessionService = require('../services/sessionService');
const SESSION_CONFIG = require('../config/sessionConfig');

const activityTracker = async (req, res, next) => {
  try {
    const sessionId = req.cookies.sessionId || req.headers['x-session-id'];
    
    if (sessionId) {
      // Check if session is valid
      const isValid = await sessionService.isSessionValid(sessionId);
      
      if (!isValid) {
        // Session expired
        res.status(401).json({
          success: false,
          message: 'Session expired. Please login again.',
          code: 'SESSION_EXPIRED'
        });
        return;
      }

      // Update last activity
      await sessionService.updateActivity(sessionId);

      // Get remaining time and attach to request
      const remainingTime = await sessionService.getRemainingTime(sessionId);
      req.remainingTime = remainingTime;
      req.sessionId = sessionId;
    }

    next();
  } catch (error) {
    console.error('Activity tracking error:', error);
    next();
  }
};

module.exports = activityTracker;
```

### API Endpoints

```javascript
// routes/auth.js
const express = require('express');
const router = express.Router();
const sessionService = require('../services/sessionService');
const SESSION_CONFIG = require('../config/sessionConfig');

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    // Authenticate user (your logic)
    const user = await authenticateUser(email, password);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Create session
    const sessionId = await sessionService.createSession(user._id, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
      rememberMe: rememberMe || false
    });

    // Set cookie
    const maxAge = rememberMe 
      ? SESSION_CONFIG.REMEMBER_ME_DURATION 
      : SESSION_CONFIG.INACTIVITY_TIMEOUT;

    res.cookie('sessionId', sessionId, {
      maxAge,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.json({
      success: true,
      message: 'Login successful',
      user,
      sessionId,
      timeout: maxAge
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Logout endpoint
router.post('/logout', async (req, res) => {
  try {
    const sessionId = req.cookies.sessionId;
    
    if (sessionId) {
      await sessionService.destroySession(sessionId);
    }

    res.clearCookie('sessionId');
    
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Check session status
router.get('/session-status', async (req, res) => {
  try {
    const sessionId = req.cookies.sessionId;
    
    if (!sessionId) {
      return res.status(401).json({
        authenticated: false,
        message: 'No session found'
      });
    }

    const isValid = await sessionService.isSessionValid(sessionId);
    const remainingTime = await sessionService.getRemainingTime(sessionId);

    res.json({
      authenticated: isValid,
      remainingTime,
      warningTime: SESSION_CONFIG.WARNING_TIME,
      logoutTime: SESSION_CONFIG.INACTIVITY_TIMEOUT
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Keep session alive (reset inactivity timer)
router.post('/keep-alive', async (req, res) => {
  try {
    const sessionId = req.cookies.sessionId;
    
    if (!sessionId) {
      return res.status(401).json({ success: false, message: 'No session' });
    }

    await sessionService.updateActivity(sessionId);
    const remainingTime = await sessionService.getRemainingTime(sessionId);

    res.json({
      success: true,
      message: 'Session refreshed',
      remainingTime
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
```

---

## 2. Frontend Implementation

### Session Manager Hook

```javascript
// hooks/useSessionManager.js
import { useEffect, useRef, useCallback, useState } from 'react';
import axios from 'axios';

const SESSION_CONFIG = {
  INACTIVITY_TIMEOUT: 15 * 60 * 1000,
  WARNING_TIME: 12 * 60 * 1000,
  CHECK_INTERVAL: 1 * 60 * 1000
};

export const useSessionManager = () => {
  const [isSessionActive, setIsSessionActive] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(SESSION_CONFIG.INACTIVITY_TIMEOUT);
  const [showWarning, setShowWarning] = useState(false);
  
  const timeoutRef = useRef(null);
  const warningTimeoutRef = useRef(null);
  const checkIntervalRef = useRef(null);

  // Reset activity timer
  const resetActivityTimer = useCallback(async () => {
    try {
      const response = await axios.post('/api/auth/keep-alive');
      
      if (response.data.success) {
        setTimeRemaining(response.data.remainingTime);
        setShowWarning(false);
        
        // Clear existing timers
        clearTimeout(timeoutRef.current);
        clearTimeout(warningTimeoutRef.current);

        // Set warning timer
        warningTimeoutRef.current = setTimeout(() => {
          setShowWarning(true);
        }, SESSION_CONFIG.WARNING_TIME);

        // Set logout timer
        timeoutRef.current = setTimeout(() => {
          handleAutoLogout();
        }, SESSION_CONFIG.INACTIVITY_TIMEOUT);
      }
    } catch (error) {
      console.error('Failed to keep session alive:', error);
    }
  }, []);

  // Handle auto logout
  const handleAutoLogout = useCallback(async () => {
    try {
      await axios.post('/api/auth/logout');
      setIsSessionActive(false);
      setShowWarning(false);
      
      // Redirect to login
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);

  // Track user activity
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      resetActivityTimer();
    };

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    // Initial setup
    resetActivityTimer();

    // Check session status periodically
    checkIntervalRef.current = setInterval(async () => {
      try {
        const response = await axios.get('/api/auth/session-status');
        
        if (!response.data.authenticated) {
          handleAutoLogout();
        } else {
          setTimeRemaining(response.data.remainingTime);
        }
      } catch (error) {
        console.error('Session check error:', error);
      }
    }, SESSION_CONFIG.CHECK_INTERVAL);

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      clearTimeout(timeoutRef.current);
      clearTimeout(warningTimeoutRef.current);
      clearInterval(checkIntervalRef.current);
    };
  }, [resetActivityTimer, handleAutoLogout]);

  return {
    isSessionActive,
    timeRemaining,
    showWarning,
    handleAutoLogout,
    resetActivityTimer
  };
};
```

### Session Warning Component

```javascript
// components/SessionWarning.jsx
import React, { useState, useEffect } from 'react';
import { AlertTriangle, LogOut, X } from 'lucide-react';

export const SessionWarning = ({ 
  isVisible, 
  timeRemaining, 
  onLogout, 
  onExtend 
}) => {
  const [displayTime, setDisplayTime] = useState(timeRemaining);

  useEffect(() => {
    setDisplayTime(Math.ceil(timeRemaining / 1000)); // Convert to seconds
  }, [timeRemaining]);

  if (!isVisible) return null;

  const minutes = Math.floor(displayTime / 60);
  const seconds = displayTime % 60;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-96 animate-in">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-yellow-500" />
          <h3 className="text-lg font-semibold text-gray-800">
            Session Expiring Soon
          </h3>
        </div>

        <p className="text-gray-600 mb-4">
          Your session will expire due to inactivity in:
        </p>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-center">
          <p className="text-3xl font-bold text-yellow-600">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Click "Stay Logged In" to continue
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onExtend}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition"
          >
            Stay Logged In
          </button>
          <button
            onClick={onLogout}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-4 text-center">
          You will be automatically logged out for security reasons
        </p>
      </div>
    </div>
  );
};
```

### App Integration

```javascript
// App.jsx
import { useSessionManager } from './hooks/useSessionManager';
import { SessionWarning } from './components/SessionWarning';

function App() {
  const {
    isSessionActive,
    timeRemaining,
    showWarning,
    handleAutoLogout,
    resetActivityTimer
  } = useSessionManager();

  if (!isSessionActive) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <p className="text-xl text-gray-800">Session Expired</p>
          <p className="text-gray-600">Please login again</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SessionWarning
        isVisible={showWarning}
        timeRemaining={timeRemaining}
        onLogout={handleAutoLogout}
        onExtend={resetActivityTimer}
      />
      
      {/* Your app content */}
      <main>
        {/* Routes and components */}
      </main>
    </>
  );
}

export default App;
```

---

## 3. Configuration Options

### Custom Timeout Periods

```javascript
// For different user roles

const ROLE_TIMEOUTS = {
  user: {
    inactivity: 15 * 60 * 1000,      // 15 minutes
    warning: 12 * 60 * 1000,         // 12 minutes
    rememberMeDuration: 7 * 24 * 60 * 60 * 1000  // 7 days
  },
  
  admin: {
    inactivity: 30 * 60 * 1000,      // 30 minutes
    warning: 25 * 60 * 1000,         // 25 minutes
    rememberMeDuration: 30 * 24 * 60 * 60 * 1000  // 30 days
  },
  
  staff: {
    inactivity: 20 * 60 * 1000,      // 20 minutes
    warning: 15 * 60 * 1000,         // 15 minutes
    rememberMeDuration: 14 * 24 * 60 * 60 * 1000  // 14 days
  }
};
```

---

## 4. Activities that Reset Timer

✅ Mouse movement  
✅ Keyboard input  
✅ Scrolling  
✅ Touch/Swipe events  
✅ Click events  
✅ Form submissions  

---

## 5. Activities that DO NOT Reset Timer

❌ Page visibility change (tab switch)  
❌ Window resize  
❌ Hover events alone  
❌ System notifications  

---

## 6. Logging & Monitoring

```javascript
// services/sessionLogger.js
const log = async (userId, action, metadata) => {
  await SessionLog.create({
    userId,
    action, // 'login', 'logout', 'timeout', 'activity'
    timestamp: Date.now(),
    metadata
  });
};

// Usage
await log(userId, 'logout', { reason: 'manual' });
await log(userId, 'timeout', { inactivityMinutes: 15 });
```

---

## 🎯 Implementation Checklist

- [ ] Configure session timeout periods
- [ ] Setup Redis for session storage
- [ ] Implement session service
- [ ] Create activity tracker middleware
- [ ] Setup auth endpoints (login, logout, keep-alive)
- [ ] Implement frontend session manager hook
- [ ] Create session warning component
- [ ] Integrate into App component
- [ ] Add event listeners for user activity
- [ ] Test auto-logout functionality
- [ ] Add session logging
- [ ] Test with different browser tabs
- [ ] Deploy to production

---

**Status**: Ready for Implementation  
**Last Updated**: May 29, 2026

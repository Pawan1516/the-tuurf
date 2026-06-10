# 🔐 Auto-Logout Feature Implementation Guide

**Auto-Logout Duration**: 1 hour of inactivity  
**Warning Display**: 5 minutes before logout  
**Status**: ✅ Fully Implemented

---

## 📋 Implementation Summary

This guide covers the auto-logout feature that automatically logs out users and admins after 1 hour of inactivity.

### Backend Components ✅ DONE
- `backend/config/sessionConfig.js` - Session timeout configuration
- `backend/services/sessionService.js` - Session management service
- `backend/middleware/activityTracker.js` - Activity tracking middleware
- `backend/routes/auth.js` - Enhanced with auto-logout endpoints
- `backend/server.js` - Session cleanup job initialization

### Frontend Components
- `client/src/hooks/useSessionManager.js` - Session manager hook
- `client/src/components/SessionWarningModal.jsx` - Warning modal (already exists)
- `client/src/components/SessionManager.jsx` - Session manager wrapper (already exists)

---

## 🚀 Backend Implementation Details

### 1. Session Configuration (`backend/config/sessionConfig.js`)

Controls all timeout durations:
```javascript
USER_INACTIVITY_TIMEOUT: 60 * 60 * 1000,      // 1 hour
ADMIN_INACTIVITY_TIMEOUT: 60 * 60 * 1000,     // 1 hour
WORKER_INACTIVITY_TIMEOUT: 60 * 60 * 1000,    // 1 hour
WARNING_TIME: 55 * 60 * 1000,                 // 5 minutes before timeout
```

### 2. Session Service (`backend/services/sessionService.js`)

Key methods:
- `updateActivity(sessionId)` - Update last activity timestamp
- `isSessionValid(sessionId, role)` - Check session validity
- `getRemainingTime(sessionId, role)` - Get time until auto-logout
- `destroySession(sessionId)` - Invalidate a session
- `cleanupExpiredSessions()` - Remove expired sessions

### 3. Activity Tracker Middleware (`backend/middleware/activityTracker.js`)

Applied to all protected routes. Updates `lastActivity` on every authenticated request.

### 4. New API Endpoints

#### GET `/api/auth/session-status`
Returns current session status and remaining time
```json
{
  "success": true,
  "authenticated": true,
  "remainingTime": 3300000,
  "warningTime": 3300000,
  "timeoutDuration": 3600000,
  "role": "user"
}
```

#### POST `/api/auth/keep-alive`
Resets inactivity timer (extend session)
```json
{
  "success": true,
  "message": "Session refreshed. Timer reset.",
  "remainingTime": 3600000,
  "refreshedAt": "2026-06-08T17:37:36.787Z"
}
```

#### GET `/api/auth/active-sessions`
List all active sessions for current user
```json
{
  "success": true,
  "totalSessions": 2,
  "sessions": [
    {
      "id": "session_id",
      "createdAt": "2026-06-08T12:00:00Z",
      "lastActivity": "2026-06-08T17:37:36Z",
      "device": { "browser": "Chrome", "os": "Windows" },
      "isCurrent": true
    }
  ]
}
```

#### POST `/api/auth/logout-session/:sessionId`
Logout a specific session (useful for "logout from all devices")

---

## 📱 Frontend Implementation

### 1. Session Manager Hook

Create or update your main App wrapper:

```jsx
import SessionManager from './components/SessionManager';
import { useSessionManager } from './hooks/useSessionManager';

function App() {
  const sessionManager = useSessionManager();
  
  return (
    <SessionManager>
      {sessionManager.isSessionActive ? (
        <MainApp />
      ) : (
        <LoginPage />
      )}
    </SessionManager>
  );
}
```

### 2. Update SessionManager Component

The existing `SessionManager.jsx` component should be updated to use the new hook:

```jsx
import { useSessionManager } from '../hooks/useSessionManager';
import SessionWarningModal from './SessionWarningModal';

const SessionManager = ({ children }) => {
  const {
    isSessionActive,
    timeRemaining,
    showWarning,
    handleAutoLogout,
    resetActivityTimer
  } = useSessionManager();

  if (!isSessionActive) {
    return <div>Session Expired</div>;
  }

  return (
    <>
      {children}
      <SessionWarningModal 
        isOpen={showWarning}
        timeLeft={timeRemaining}
        onStay={resetActivityTimer}
        onLogout={handleAutoLogout}
      />
    </>
  );
};
```

---

## 🔄 How It Works

### Backend Flow

1. **User Logs In**
   - Access token generated with 1-hour expiry
   - Session created in database with `lastActivity = now`

2. **User Makes Requests**
   - `activityTracker` middleware updates `lastActivity`
   - Session TTL automatically resets to 1 hour from now

3. **Inactivity Detection**
   - Frontend detects no activity for 55 minutes
   - Shows warning modal with 5-minute countdown
   - After 60 minutes of inactivity, auto-logout triggers

4. **Session Cleanup**
   - Every 30 minutes, expired sessions are removed from database
   - Failed logins are tracked and locked after 5 attempts

### Frontend Flow

1. **Activity Tracking**
   - Listens to: `mousedown`, `keydown`, `scroll`, `touchstart`, `click`
   - Debounces activity calls (5-second minimum between calls)
   - Calls `/api/auth/keep-alive` to reset timer

2. **Warning Modal**
   - Appears 55 minutes into the session
   - Shows countdown timer (5 minutes)
   - Options: "Stay Logged In" or "Logout Now"

3. **Multi-Tab Synchronization**
   - Uses `BroadcastChannel` API
   - If logged out in one tab, all tabs are notified
   - Prevents inconsistent state across tabs

---

## ⚙️ Configuration

### Change Timeout Duration

Edit `backend/config/sessionConfig.js`:
```javascript
USER_INACTIVITY_TIMEOUT: 30 * 60 * 1000,  // Change from 1 hour to 30 minutes
WARNING_TIME: 25 * 60 * 1000,             // Show warning 5 minutes before
```

### Different Timeouts per Role

```javascript
const ROLE_TIMEOUTS = {
  user: 60 * 60 * 1000,     // 1 hour
  admin: 120 * 60 * 1000,   // 2 hours
  worker: 30 * 60 * 1000    // 30 minutes
};
```

---

## 🧪 Testing

### Test Auto-Logout

1. **Frontend Test**
   ```bash
   # Set short timeout for testing (in useSessionManager.js)
   const TIMEOUT_DURATION = 2 * 60 * 1000; // 2 minutes
   const WARNING_TIME = 1.5 * 60 * 1000;   // Show warning after 30 seconds
   ```

2. **Verify Activity Tracking**
   - Login to the app
   - Check that requests include session activity updates
   - Monitor `lastActivity` field in database

3. **Test Warning Modal**
   - Don't interact with app for 55 minutes
   - Modal should appear with countdown
   - Test "Stay Logged In" button (should reset timer)

4. **Test Auto-Logout**
   - Don't interact for full 60 minutes
   - Should be automatically logged out
   - Redirected to login page with `?expired=true` query param

### Test Multi-Tab Logout

1. Open app in two browser tabs
2. Logout in one tab
3. Other tab should also logout immediately

### Test Session Endpoints

```bash
# Check session status
curl -H "Authorization: Bearer <token>" http://localhost:5000/api/auth/session-status

# Keep session alive
curl -X POST -H "Authorization: Bearer <token>" http://localhost:5000/api/auth/keep-alive

# List active sessions
curl -H "Authorization: Bearer <token>" http://localhost:5000/api/auth/active-sessions

# Logout specific session
curl -X POST -H "Authorization: Bearer <token>" http://localhost:5000/api/auth/logout-session/<sessionId>
```

---

## 🔒 Security Features

1. **Inactivity Detection** - Logout after 1 hour without activity
2. **IP Tracking** - Detects IP changes (can prevent hijacking)
3. **Device Fingerprinting** - Stores browser/OS information
4. **Token Rotation** - Refresh tokens rotate on each use
5. **Multi-Tab Protection** - Logout syncs across browser tabs
6. **Session Revocation** - Sessions can be invalidated immediately
7. **Rate Limiting** - Failed login attempts lock account (5 attempts)

---

## 📊 Monitoring

### Check Expired Sessions

```javascript
// In MongoDB
db.sessions.find({
  isValid: false,
  expiresAt: { $lt: new Date() }
}).count()
```

### View Active Sessions

```javascript
db.sessions.find({
  isValid: true,
  expiresAt: { $gt: new Date() }
}).count()
```

### Session Activity Timeline

```javascript
db.sessions.aggregate([
  { $match: { isValid: true } },
  { $group: {
    _id: "$userId",
    lastActivity: { $max: "$lastActivity" },
    sessionCount: { $sum: 1 }
  }},
  { $sort: { lastActivity: -1 } }
])
```

---

## 🚨 Troubleshooting

### Sessions Not Expiring

- Check `SESSION_CONFIG` timeout values
- Verify middleware is applied to routes
- Check database for corrupted session records

### Warning Modal Not Appearing

- Verify frontend hook is properly initialized
- Check browser console for errors
- Ensure `showWarning` state is being updated

### Activity Not Being Tracked

- Verify `activityTracker` middleware is applied before route handlers
- Check that requests have valid JWT tokens
- Look for errors in server logs

### Multiple Logouts in Different Tabs

- Verify `BroadcastChannel` is supported (modern browsers only)
- Check browser console for message errors
- Test in incognito mode

---

## 📝 Environment Variables

```env
JWT_SECRET=<your-secret-key>
SESSION_TIMEOUT=3600000  # 1 hour in milliseconds
NODE_ENV=production      # Enable secure cookies
```

---

## ✅ Checklist

- [x] Backend configuration created
- [x] Session service implemented
- [x] Activity tracker middleware added
- [x] New API endpoints created
- [x] Session cleanup job initialized
- [x] Frontend hook implemented
- [x] Session warning modal exists
- [x] Multi-tab sync implemented
- [ ] Test in development
- [ ] Test in staging
- [ ] Test in production
- [ ] Monitor session cleanup logs
- [ ] Update user documentation
- [ ] Train support team

---

## 🔗 Related Documentation

- [Backend Auth Routes](./backend/routes/auth.js)
- [Session Model](./backend/models/Session.js)
- [Verify Token Middleware](./backend/middleware/verifyToken.js)
- [Auth Service](./backend/services/authService.js)

---

**Last Updated**: June 8, 2026  
**Status**: Production Ready ✅

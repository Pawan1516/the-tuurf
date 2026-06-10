# ✅ Auto-Logout Integration Checklist

Use this checklist to integrate the auto-logout feature into your application.

---

## 🔧 Backend Setup

- [x] Backend files created (config, service, middleware)
- [x] Auth endpoints added (4 new endpoints)
- [x] Session cleanup job added
- [x] Syntax verified
- [x] Ready to use (just restart server)

**Action**: 
```bash
npm start
```

---

## 📱 Frontend Integration

### Step 1: Import Hook in Main App
- [ ] Open `src/App.jsx` or main entry point
- [ ] Add import: `import { useSessionManager } from './hooks/useSessionManager';`
- [ ] Call hook in component: `useSessionManager();`

**Code Example**:
```jsx
import { useSessionManager } from './hooks/useSessionManager';
import SessionManager from './components/SessionManager';

function App() {
  // Initialize session management
  useSessionManager();
  
  return (
    <SessionManager>
      {/* Your existing app content */}
    </SessionManager>
  );
}

export default App;
```

### Step 2: Verify SessionWarningModal Component
- [ ] Check `client/src/components/SessionWarningModal.jsx` exists
- [ ] Component is already styled and ready to use
- [ ] No changes needed

### Step 3: Verify SessionManager Component
- [ ] Check `client/src/components/SessionManager.jsx` exists
- [ ] Component wraps children and displays warning modal
- [ ] No changes needed (uses existing component)

---

## 🧪 Testing Checklist

### Quick Test (with default 1-hour timeout)
- [ ] Start backend: `npm start`
- [ ] Start frontend: `npm run dev`
- [ ] Login to application
- [ ] Verify session is active
- [ ] Open browser DevTools → Network tab
- [ ] Make a request and verify `/auth/keep-alive` is called
- [ ] Check Console for session activity logs

### Activity Tracking Test
- [ ] Move mouse → Activity should be tracked
- [ ] Type on keyboard → Activity should be tracked
- [ ] Scroll page → Activity should be tracked
- [ ] Touch screen (mobile) → Activity should be tracked
- [ ] Verify each action resets the timer

### Warning Modal Test (with short timeout for testing)
- [ ] Edit `client/src/hooks/useSessionManager.js`
- [ ] Change `TIMEOUT_DURATION = 2 * 60 * 1000` (2 minutes)
- [ ] Change `WARNING_TIME = 1.5 * 60 * 1000` (90 seconds)
- [ ] Login to app
- [ ] After 90 seconds, warning modal should appear
- [ ] Verify countdown is working (showing remaining time)
- [ ] Click "Stay Logged In" → Timer should reset
- [ ] Wait 2 more minutes → Should auto-logout

### Multi-Tab Logout Test
- [ ] Login in Tab A
- [ ] Open same app in Tab B (different browser tab)
- [ ] Logout in Tab A
- [ ] Tab B should automatically logout (check page)
- [ ] Both tabs should redirect to login

### API Endpoint Tests
- [ ] Test `GET /api/auth/session-status` with token
  ```bash
  curl -H "Authorization: Bearer <token>" \
    http://localhost:5000/api/auth/session-status
  ```
- [ ] Test `POST /api/auth/keep-alive` with token
  ```bash
  curl -X POST -H "Authorization: Bearer <token>" \
    http://localhost:5000/api/auth/keep-alive
  ```
- [ ] Test `GET /api/auth/active-sessions` with token
  ```bash
  curl -H "Authorization: Bearer <token>" \
    http://localhost:5000/api/auth/active-sessions
  ```

---

## 📊 Monitoring & Verification

### Backend Logs
- [ ] Check server logs for "Session cleanup" messages every 30 minutes
- [ ] Verify activity tracking in request logs
- [ ] Monitor for any errors in session service

### Database
- [ ] Connect to MongoDB Atlas
- [ ] Check `sessions` collection exists
- [ ] Verify `lastActivity` is being updated on requests
- [ ] Confirm expired sessions are being removed

### Frontend Console
- [ ] No JavaScript errors on page
- [ ] No 401 "Session expired" errors (unless testing logout)
- [ ] BroadcastChannel messages should be logged (optional)

---

## 🔐 Security Verification

- [ ] Verify tokens expire after 1 hour
- [ ] Verify access denied with invalid token
- [ ] Verify session is invalidated on logout
- [ ] Verify IP address is tracked in sessions
- [ ] Verify device info is stored in sessions
- [ ] Verify failed login attempts are tracked (5 attempts = lockout)

---

## 🚀 Deployment Checklist

### Before Production
- [ ] Test in development environment ✓
- [ ] Test in staging environment
- [ ] Update environment variables
- [ ] Configure timeouts for production
- [ ] Set `NODE_ENV=production`

### After Deployment
- [ ] Verify all endpoints are working
- [ ] Monitor session cleanup logs
- [ ] Check database session collection growth
- [ ] Monitor for logout-related issues
- [ ] Train support team on auto-logout feature

### User Communication
- [ ] Update user documentation
- [ ] Notify users about auto-logout feature
- [ ] Provide troubleshooting guide for users
- [ ] Explain warning modal behavior

---

## 🐛 Troubleshooting

### Sessions not expiring
- [ ] Check `SESSION_CONFIG` timeout values
- [ ] Verify middleware is applied to routes
- [ ] Check server logs for errors
- [ ] Verify database connection

### Warning modal not showing
- [ ] Verify hook is imported in App
- [ ] Check browser console for errors
- [ ] Verify warning component exists
- [ ] Test with console logs

### Activity not being tracked
- [ ] Verify middleware is in place
- [ ] Check if token is valid
- [ ] Monitor network requests in DevTools
- [ ] Check server logs

### Multi-tab not syncing
- [ ] Verify browser supports BroadcastChannel API
- [ ] Check browser console for errors
- [ ] Test in same domain (no subdomain differences)
- [ ] Try different browsers/devices

---

## 📚 Documentation References

- **QUICK_REFERENCE_AUTO_LOGOUT.md** - Overview of changes
- **IMPLEMENTATION_GUIDE_AUTO_LOGOUT.md** - Complete guide
- **AUTO_LOGOUT_FEATURE.md** - Original design document
- **IMPLEMENTATION_SUMMARY.md** - Summary of all changes

---

## 🔄 Configuration Options

### Change Timeout Duration
Edit `backend/config/sessionConfig.js`:
```javascript
USER_INACTIVITY_TIMEOUT: 30 * 60 * 1000,  // Change to 30 minutes
ADMIN_INACTIVITY_TIMEOUT: 60 * 60 * 1000, // Admins: 1 hour
WORKER_INACTIVITY_TIMEOUT: 45 * 60 * 1000, // Workers: 45 minutes
```

### Change Warning Time
```javascript
WARNING_TIME: 25 * 60 * 1000,  // Change to show warning 5 minutes before
```

### Change Cleanup Interval
Edit `backend/server.js`:
```javascript
// Change from 30 minutes to 1 hour
}, 60 * 60 * 1000);
```

---

## ✅ Final Checklist

### Development
- [ ] Backend running without errors
- [ ] Frontend imports hook successfully
- [ ] Session warning modal displays correctly
- [ ] Activity tracking works
- [ ] Auto-logout triggers after timeout
- [ ] Multi-tab logout syncs
- [ ] API endpoints return correct responses

### Staging
- [ ] All development tests pass
- [ ] Production-like environment tested
- [ ] Load testing (multiple concurrent users)
- [ ] Performance monitoring
- [ ] Database cleanup working

### Production
- [ ] All staging tests pass
- [ ] Monitoring alerts configured
- [ ] Backup/recovery plan in place
- [ ] User documentation updated
- [ ] Support team trained
- [ ] Rollback plan prepared

---

## 📞 Support & Issues

If you encounter issues:

1. Check **TROUBLESHOOTING** section above
2. Review **IMPLEMENTATION_GUIDE_AUTO_LOGOUT.md**
3. Check browser console for errors
4. Check server logs: `npm start | grep -i session`
5. Verify database connection and queries

---

**Status**: Ready for Integration ✅  
**Last Updated**: June 8, 2026  
**Estimated Integration Time**: 15-30 minutes

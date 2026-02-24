# WhatsApp Webhook Configuration Guide

## ✅ Backend Status
- **Local Endpoint**: http://localhost:5001/api/whatsapp-simple/webhook
- **Status**: Working ✅ (verified - returns correct challenge)
- **Verify Token**: `cricket_booking_token`

## Problem
Your local backend is working perfectly, but Meta WhatsApp Cloud API can't reach it because it's on localhost (only accessible on your computer, not the internet). **You need a public tunnel URL.**

---

## Solution 1: Using ngrok (Recommended)

### Step 1: Install ngrok
```bash
npm install -g ngrok
# OR download from https://ngrok.com/download
```

### Step 2: Start ngrok tunnel
Open a **new Command Prompt or PowerShell** and run:
```bash
ngrok http 5001
```

### Step 3: Get your public URL
You'll see output like:
```
Session Status                online
Account                       [your account]
Version                        3.x.x
Region                         us (United States)
Latency                        xx ms
Web Interface                  http://127.0.0.1:4040
Forwarding                     https://xxxx-xxxx-xxxx-xxxx.ngrok.io -> http://localhost:5001
```

**Copy the HTTPS URL from "Forwarding"** (e.g., `https://xxxx-xxxx-xxxx-xxxx.ngrok.io`)

### Step 4: Build your webhook URL
```
https://[YOUR_NGROK_URL]/api/whatsapp-simple/webhook
```
Example:
```
https://1234-56-789-012-345.ngrok.io/api/whatsapp-simple/webhook
```

### Step 5: Test before Meta configuration
Replace `[YOUR_URL]` and test:
```bash
curl "https://[YOUR_URL]/api/whatsapp-simple/webhook?hub.mode=subscribe&hub.verify_token=cricket_booking_token&hub.challenge=test123"
```

Should return: `test123`

---

## Solution 2: Using localtunnel

### Step 1: Install localtunnel
```bash
npm install -g localtunnel
```

### Step 2: Start tunnel
```bash
lt --port 5001 --subdomain cricketbooking
```

### Step 3: Use the URL
```
https://cricketbooking.loca.lt/api/whatsapp-simple/webhook
```

### Step 4: Test
```bash
curl "https://cricketbooking.loca.lt/api/whatsapp-simple/webhook?hub.mode=subscribe&hub.verify_token=cricket_booking_token&hub.challenge=test123"
```

---

## Configuring in Meta Developer Console

Once you have your public URL:

1. Go to **Meta App Dashboard** → **Your App** → **Settings** → **Basic**
2. Under **WhatsApp** section, find **Webhook Configuration**
3. Enter:
   - **Callback URL**: `https://[YOUR_PUBLIC_URL]/api/whatsapp-simple/webhook`
   - **Verify Token**: `cricket_booking_token`
4. Click **Verify and Save**
5. Should show ✅ **Success**

If it fails, check:
- ✅ Tunnel is running
- ✅ Backend server is running (`npm start` in server folder)
- ✅ URL is correct (copy-paste, no typos)
- ✅ Verify token matches exactly: `cricket_booking_token`

---

## Permanent Solutions (Deploy to Cloud)

If you want to run 24/7 without keeping ngrok running:

### Option A: Render.com (Free tier available)
1. Create account at render.com
2. Click "New Service" → "Web Service"
3. Connect GitHub repo with 'The Turf' server code
4. Build: `npm install`
5. Start: `npm start`
6. Get public URL automatically
7. Use that URL in Meta configuration

### Option B: Railway.app
1. Create account at railway.app  
2. Import GitHub repo
3. Railway auto-detects Node.js and builds
4. Get public URL in Deployment section
5. Use in Meta configuration

### Option C: Heroku (Was free, now paid)
1. Create account at heroku.com
2. Deploy Node.js backend
3. Get `.herokuapp.com` URL
4. Use in Meta configuration

---

## Current Status Summary

| Component | Status |
|-----------|--------|
| Backend Server | ✅ Running on port 5001 |
| WhatsApp Handler | ✅ Working locally |
| GET Verification | ✅ Returns correct challenge |
| POST Message Handler | ✅ Ready |
| Public Tunnel | ⏳ Needs setup (choose Solution 1 or 2) |
| Meta Configuration | ⏳ Pending public URL |
| End-to-end WhatsApp | ⏳ Pending tunnel + Meta config |

---

## Quick Manual Test

To manually test the tunnel without Meta:

```bash
# Test verification (should return: test123)
curl "https://[YOUR_URL]/api/whatsapp-simple/webhook?hub.mode=subscribe&hub.verify_token=cricket_booking_token&hub.challenge=test123"

# HTTP Status should be 200 OK
```

---

## Contact Support

If tunnel validation still fails:
- Check backend console for errors: Watch your `npm start` terminal
- Verify .env file has: `WA_PHONE_NUMBER_ID` and `WA_ACCESS_TOKEN`
- Try the other tunnel solution (ngrok vs localtunnel)
- Check firewall not blocking outbound HTTPS

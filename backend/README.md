# 🏟️ THE TURF — WhatsApp Automachine v2.0

A high-fidelity WhatsApp slot booking system with an AI Agent, real-time Admin Dashboard, and Automated QR Pass Generation.

## 🚀 Setup Guide

### 1. Install Dependencies
Run the following in the `server` directory:
```bash
npm install
```

### 2. Configure Twilio (Free Sandbox)
1. Sign up at [twilio.com](https://www.twilio.com/).
2. Get your **Account SID** and **Auth Token** from the dashboard.
3. Go to **Messaging** -> **Try it Out** -> **Send a WhatsApp Message**.
4. Join the sandbox by sending the code (e.g., `join optic-monkey`) from your phone to the number provided.
5. In the **Sandbox Settings**, you will need to set the Webhook URL (Step 4).

### 3. Set Up Environment
Create a `.env` file based on `.env.example`:
```env
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886 (check your sandbox number)
PUBLIC_URL=https://xxxx.ngrok-free.app (from Step 4)
ADMIN_PASSWORD=your_pass
```

### 4. Run ngrok (Local Webhook)
Since the script runs on your computer, use ngrok to make it reachable for Twilio:
```bash
ngrok http 3000
```
Copy the `https://...` URL and:
1. Paste it into your `.env` as `PUBLIC_URL`.
2. Go to **Twilio Sandbox Settings** and set the "A MESSAGE COMES IN" URL to:
   `https://your-id.ngrok-free.app/webhook` (Method: POST).

### 5. Start the Server
```bash
npm start
```

### 6. Open Admin Dashboard
Navigate to:
`http://localhost:3000/admin`
Use your `ADMIN_PASSWORD` to log in.

---

## 🤖 Features
- **AI Agent:** Claude Sonnet analyzes your booking requests.
- **Auto-Resolve Hold:** 15sec countdown for high-congestion slots.
- **QR Passes:** High-quality PNG passes with green branding.
- **Real-time Admin:** Live updates via Socket.io.
- **Multi-Sport:** Football, Cricket, Basketball, Badminton support.

_Built for THE TURF Stadium_ 🏟️

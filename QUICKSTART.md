# 🚀 The Turf - Quick Start Guide

## Prerequisites

- Node.js (v14+)
- npm or yarn
- MongoDB Atlas account (free tier)
- Razorpay account (test mode)
- Twilio account (optional, for WhatsApp)

---

## Step 1: Setup MongoDB

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user
4. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/theturf?retryWrites=true&w=majority`

---

## Step 2: Setup Razorpay

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Create account or login
3. Go to Settings > API Keys
4. Copy Test Mode keys:
   - Key ID
   - Key Secret

---

## Step 3: Setup Backend

```bash
cd server

# 1. Install dependencies
npm install

# 2. Create .env file
cat > .env << EOF
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/theturf
JWT_SECRET=your_secret_key_at_least_32_characters_long_for_security
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
ADMIN_PASSWORD=admin@123
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
EOF

# 3. Seed admin account
npm run seed

# 4. Start server
npm run dev
# Server runs at http://localhost:5000
```

---

## Step 4: Setup Frontend

```bash
cd client

# 1. Install dependencies
npm install

# 2. Create .env file (if needed)
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env

# 3. Start development server
npm start
# App runs at http://localhost:3000
```

---

## Step 5: Test the Application

### 1. **Public Booking Flow**
   - Open `http://localhost:3000`
   - Click on an available slot (green)
   - Enter name and phone
   - Click "Proceed to Payment"
   - Use test card: `4111 1111 1111 1111`
   - Any future expiry and 3-digit CVV
   - Confirm payment

### 2. **Admin Login**
   - Go to `http://localhost:3000/admin/login`
   - Email: `admin@theturf.com`
   - Password: `admin@123` (or your ADMIN_PASSWORD)
   - You're now in Admin Dashboard

### 3. **Admin Operations**
   - **Create Slots**: Go to "Slots" → "Create New Slot"
   - **Create Worker**: Go to "Workers" → "Create New Worker"
   - **View Bookings**: Go to "Bookings" → See all pending bookings
   - **Confirm/Reject**: Click confirm or reject button (WhatsApp sent if configured)
   - **View Revenue**: Check "Dashboard" for analytics
   - **Download Report**: Go to "Reports" → Download PDF

### 4. **Worker Login**
   - Create a worker from Admin panel
   - Go to `http://localhost:3000/worker/login`
   - Login with worker credentials
   - View assigned bookings
   - Confirm/reject and verify payments
   - Download report of your bookings

---

## Troubleshooting

### MongoDB Connection Error
```
Error: connect ENOTFOUND mongodb...
```
**Solution**: Check your MongoDB URI in .env is correct and IP whitelist is configured

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use
```
**Solution**: Change PORT in .env or kill process on that port

### JWT Secret Error
```
Error: secret should be at least 32 characters
```
**Solution**: Use longer JWT_SECRET in .env (min 32 characters)

### Razorpay Error
```
Error: Razorpay script not loaded
```
**Solution**: Check internet connection and Razorpay CDN is accessible

### CORS Errors
```
Access to XMLHttpRequest blocked
```
**Solution**: Make sure FRONTEND_URL in .env matches client URL

---

## File Structure for Reference

```
The Turf/
├── server/
│   ├── config/db.js           ← MongoDB connection
│   ├── models/                ← Database schemas
│   ├── routes/                ← API endpoints
│   ├── services/              ← Business logic
│   ├── middleware/            ← Auth & error handling
│   ├── seed/adminSeed.js     ← Create admin account
│   ├── server.js              ← Main server file
│   ├── .env                   ← Your secrets (create this)
│   └── package.json
│
└── client/
    ├── src/
    │   ├── pages/             ← All page components
    │   ├── context/           ← Auth context
    │   ├── api/               ← API client
    │   ├── App.jsx            ← Main app & routing
    │   └── index.js           ← Entry point
    ├── .env                   ← Your env vars
    └── package.json
```

---

## API Endpoints Reference

### Public Endpoints (No Auth)
```
GET  /api/slots                      ← Get all slots
POST /api/bookings                   ← Create booking
POST /api/payments/create-order      ← Create payment order
POST /api/payments/verify            ← Verify payment
```

### Worker Endpoints (JWT Required)
```
GET  /api/bookings/my-slots          ← Your assigned bookings
PUT  /api/bookings/:id/status        ← Update booking status
PUT  /api/bookings/:id/payment       ← Verify payment
GET  /api/bookings/report/download   ← Download CSV report
```

### Admin Endpoints (JWT Required)
```
POST   /api/slots                    ← Create slot
PUT    /api/slots/:id/status         ← Update slot status
PUT    /api/slots/:id/assign         ← Assign worker
GET    /api/bookings                 ← Get all bookings
PUT    /api/bookings/:id/status      ← Confirm/reject booking
POST   /api/admin/workers            ← Create worker
GET    /api/admin/workers            ← List workers
DELETE /api/admin/workers/:id        ← Delete worker
GET    /api/admin/revenue            ← Revenue stats
GET    /api/admin/report/pdf         ← Download PDF report
```

---

## Next Steps

1. ✅ Backend running
2. ✅ Frontend running
3. ✅ Database connected
4. 📧 **Optional**: Add Twilio for WhatsApp notifications
5. 📊 **Optional**: Configure advanced Razorpay settings
6. 🚀 **Deploy**: Push to GitHub and deploy to Vercel + Render

---

## Environment Variables Checklist

**Backend (.env)**
- [ ] MONGODB_URI
- [ ] JWT_SECRET (min 32 chars)
- [ ] RAZORPAY_KEY_ID
- [ ] RAZORPAY_KEY_SECRET
- [ ] ADMIN_PASSWORD
- [ ] PORT
- [ ] NODE_ENV
- [ ] FRONTEND_URL

**Frontend (.env)**
- [ ] REACT_APP_API_URL

---

## Useful Commands

```bash
# Backend
npm run dev              # Start with nodemon
npm start               # Start production
npm run seed            # Seed admin account

# Frontend
npm start               # Development server
npm run build           # Production build
npm test                # Run tests
```

---

## Default Credentials

| User | Email | Password |
|---|---|---|
| Admin | admin@theturf.com | admin@123 |

**Note**: Worker accounts must be created by admin

---

## Need Help?

1. Read the full README.md
2. Check server console for errors
3. Check browser console for frontend errors
4. Verify all environment variables
5. Check MongoDB connection
6. Verify API keys for Razorpay

---

**Happy Coding! 🎉**

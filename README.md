# 🏟️ The Turf - Complete Project Guide

## Project Overview

**The Turf** is a comprehensive sports turf booking and management web application built with modern technologies. It allows users to book time slots, workers to manage bookings, and admins to oversee the entire operation.

---

## 🚀 Quick Start

### Backend Setup

1. **Install Dependencies**
   ```bash
   cd server
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your credentials:
   - MongoDB URI
   - JWT Secret
   - Razorpay API Keys
   - Twilio WhatsApp Credentials

3. **Seed Admin Account**
   ```bash
   npm run seed
   ```

4. **Start Server**
   ```bash
   npm run dev
   ```
   Server will run on `http://localhost:5000`

### Frontend Setup

1. **Install Dependencies**
   ```bash
   cd client
   npm install
   ```

2. **Create .env file**
   ```bash
   REACT_APP_API_URL=http://localhost:5000/api
   ```

3. **Start Development Server**
   ```bash
   npm start
   ```
   App will run on `http://localhost:3000`

---

## 📁 Project Structure

```
The Turf/
├── server/                    # Node.js & Express Backend
│   ├── config/               # Configuration files
│   │   └── db.js            # MongoDB connection
│   ├── middleware/           # Express middleware
│   │   ├── verifyToken.js   # JWT verification
│   │   ├── roleGuard.js     # Role-based access
│   │   └── errorHandler.js  # Error handling
│   ├── models/              # Mongoose schemas
│   │   ├── Admin.js
│   │   ├── Worker.js
│   │   ├── Slot.js
│   │   └── Booking.js
│   ├── routes/              # API endpoints
│   │   ├── auth.js          # Authentication
│   │   ├── slots.js         # Slot management
│   │   ├── bookings.js      # Booking operations
│   │   ├── payments.js      # Payment processing
│   │   └── admin.js         # Admin operations
│   ├── services/            # Business logic
│   │   ├── whatsapp.js      # Twilio WhatsApp
│   │   ├── payment.js       # Razorpay integration
│   │   └── pdfReport.js     # PDF generation
│   ├── seed/                # Database seeding
│   │   └── adminSeed.js    # Create admin account
│   ├── .env.example        # Environment template
│   ├── server.js           # Main server file
│   └── package.json
│
└── client/                  # React Frontend
    ├── public/             # Static assets
    │   └── index.html
    ├── src/
    │   ├── pages/          # Page components
    │   │   ├── public/     # No login required
    │   │   │   ├── Home.jsx        # Slot browsing
    │   │   │   ├── BookSlot.jsx    # Booking form
    │   │   │   ├── Payment.jsx     # Razorpay checkout
    │   │   │   └── BookingSuccess.jsx
    │   │   ├── worker/     # Worker authenticated
    │   │   │   ├── Login.jsx
    │   │   │   ├── Dashboard.jsx
    │   │   │   ├── BookingDetail.jsx
    │   │   │   └── Report.jsx
    │   │   └── admin/      # Admin authenticated
    │   │       ├── Login.jsx
    │   │       ├── Dashboard.jsx
    │   │       ├── Slots.jsx
    │   │       ├── Bookings.jsx
    │   │       ├── Workers.jsx
    │   │       └── Report.jsx
    │   ├── components/     # Reusable components
    │   ├── context/        # Auth context
    │   │   └── AuthContext.jsx
    │   ├── api/            # API client
    │   │   └── client.js
    │   ├── App.jsx         # Main app with routing
    │   ├── index.js        # React entry point
    │   ├── index.css       # Global styles
    │   └── package.json
    └── .env.example
```

---

## 🔐 Authentication & Authorization

### User Roles

| Role | Login | Register | Access |
|---|---|---|---|
| **User** | ❌ No | ❌ No | Browse & book slots |
| **Worker** | ✅ Yes | ❌ Admin creates | Worker dashboard |
| **Admin** | ✅ Yes | ❌ Seeded | Full admin panel |

### Authentication Flow

1. User visits `/worker/login` or `/admin/login`
2. Enters email & password
3. Backend validates and returns JWT token
4. Token stored in localStorage
5. Automatically added to all API requests
6. Protected routes check token validity

---

## 🌐 API Endpoints

### Auth
- **POST** `/api/auth/login` - Login (worker or admin)

### Slots
- **GET** `/api/slots` - Get all slots (public)
- **POST** `/api/slots` - Create slot (admin only)
- **PUT** `/api/slots/:id/status` - Update status (admin only)
- **PUT** `/api/slots/:id/assign` - Assign worker (admin only)
- **DELETE** `/api/slots/:id` - Delete slot (admin only)

### Bookings
- **POST** `/api/bookings` - Create booking (public)
- **GET** `/api/bookings` - Get all bookings (admin only)
- **GET** `/api/bookings/my-slots` - Worker's bookings (worker only)
- **PUT** `/api/bookings/:id/status` - Update booking status
- **PUT** `/api/bookings/:id/username` - Update user name
- **PUT** `/api/bookings/:id/payment` - Verify payment
- **GET** `/api/bookings/report/download` - Worker report (worker only)

### Payments
- **POST** `/api/payments/create-order` - Create Razorpay order
- **POST** `/api/payments/verify` - Verify payment signature

### Admin
- **POST** `/api/admin/workers` - Create worker
- **GET** `/api/admin/workers` - List workers
- **PUT** `/api/admin/workers/:id` - Update worker
- **DELETE** `/api/admin/workers/:id` - Delete worker
- **GET** `/api/admin/revenue` - Revenue stats
- **GET** `/api/admin/report/pdf` - Download PDF report

---

## 📱 Frontend Pages

### Public Pages (No Authentication)
- `/` - **Home** - Browse available slots
- `/book/:slotId` - **Book Slot** - Enter details and create booking
- `/payment` - **Payment** - Razorpay checkout
- `/booking-success` - **Success** - Confirmation page

### Worker Pages (JWT Required)
- `/worker/login` - Worker login
- `/worker/dashboard` - View assigned bookings
- `/worker/booking/:id` - Booking details & actions
- `/worker/report` - Download booking report

### Admin Pages (JWT Required)
- `/admin/login` - Admin login
- `/admin/dashboard` - Revenue analytics
- `/admin/slots` - Create & manage slots
- `/admin/bookings` - View & confirm/reject bookings
- `/admin/workers` - Create & manage workers
- `/admin/report` - Download PDF reports

---

## 🔧 Database Models

### Admin
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (hashed),
  role: "admin",
  createdAt: Date
}
```

### Worker
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  phone: String,
  password: String (hashed),
  role: "worker",
  assignedSlots: [SlotId],
  createdAt: Date,
  updatedAt: Date
}
```

### Slot
```javascript
{
  _id: ObjectId,
  date: Date,
  startTime: String (HH:MM),
  endTime: String (HH:MM),
  status: "free" | "booked" | "hold",
  assignedWorker: WorkerId,
  createdAt: Date,
  updatedAt: Date
}
```

### Booking
```javascript
{
  _id: ObjectId,
  userName: String,
  userPhone: String,
  slot: SlotId,
  paymentStatus: "pending" | "verified" | "failed",
  paymentId: String,
  amount: Number,
  bookingStatus: "pending" | "confirmed" | "rejected" | "hold",
  whatsappNotified: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 💳 Payment Integration (Razorpay)

### Flow
1. User books slot and enters details
2. Frontend calls `/api/payments/create-order`
3. Backend creates Razorpay order and returns order ID
4. Razorpay payment modal opens
5. User completes payment
6. Frontend verifies payment with `/api/payments/verify`
7. Backend validates signature and updates booking

### Environment Variables Needed
```
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
```

---

## 📱 WhatsApp Notifications (Twilio)

### Triggers
- **Confirmed**: Admin confirms booking → WhatsApp sent to user
- **Rejected**: Admin rejects booking → WhatsApp sent to user
- **Hold**: No notification (temporary reservation)

### Messages
- **Confirmed**: "Hi [Name], your booking at The Turf on [Date] at [Time] is CONFIRMED! See you on the turf! 🏆"
- **Rejected**: "Hi [Name], your booking at The Turf on [Date] at [Time] has been REJECTED. Reach us for support."

### Environment Variables Needed
```
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

---

## 📄 PDF Report Generation

### Features
- Server-side generation with PDFKit
- Includes booking summary and statistics
- Filterable by date range, status, worker
- Streamed directly to browser as download

### Admin Report Includes
- The Turf header
- Summary statistics (total, confirmed, rejected, revenue)
- Complete booking table
- Filter options (date range, status, worker)

---

## 🛠️ Development Tips

### Testing Authentication
1. Use admin login: `admin@theturf.com` / `admin@123` (from seed)
2. Create workers via admin panel
3. Login as worker with created credentials

### Testing Payments
- Use Razorpay test mode keys
- Test card: 4111 1111 1111 1111
- Any future expiry date and 3-digit CVV

### Testing WhatsApp
- Use Twilio test credentials
- Messages sent to registered numbers
- Check Twilio console for delivery status

### Common Issues
- **MongoDB connection fails**: Check connection string in .env
- **JWT token invalid**: Clear localStorage and re-login
- **CORS errors**: Ensure FRONTEND_URL in server .env matches client URL
- **Razorpay fails**: Verify API keys and test mode settings

---

## 📦 Deployment

### Backend (Render/Railway)
1. Push code to GitHub
2. Connect repository to Render/Railway
3. Set environment variables
4. Deploy automatically on push

### Frontend (Vercel)
1. Connect GitHub repository to Vercel
2. Set `REACT_APP_API_URL` to backend production URL
3. Deploy automatically on push

### Database (MongoDB Atlas)
1. Create free cluster on MongoDB Atlas
2. Update `MONGODB_URI` with production connection string
3. Ensure IP whitelist is configured

---

## 📚 Tech Stack

| Layer | Technology | Version |
|---|---|---|
| **Frontend** | React.js | 18.2.0 |
| **Frontend UI** | Tailwind CSS | 3.3.0 |
| **Backend** | Node.js + Express | 5.2.1 |
| **Database** | MongoDB + Mongoose | 9.2.1 |
| **Authentication** | JWT | 9.0.3 |
| **Payments** | Razorpay | 2.9.1 |
| **Messaging** | Twilio | 3.93.0 |
| **PDF** | PDFKit | 0.13.0 |

---

## 🎯 Future Enhancements

1. **Email Notifications** - Nodemailer integration
2. **SMS Alerts** - Twilio SMS for additional channels
3. **Advanced Analytics** - More detailed revenue charts
4. **Worker Scheduling** - Automated shift assignments
5. **Cancellation Policy** - Allow user cancellations with refunds
6. **Reviews & Ratings** - User feedback system
7. **Multi-language Support** - i18n integration
8. **Mobile App** - React Native/Flutter version
9. **Payment Methods** - Stripe, PayPal integration
10. **Admin Notifications** - Email alerts for new bookings

---

## 📄 License

MIT License - Feel free to use and modify this project

---

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review API endpoint documentation
3. Check environment variables configuration
4. Verify MongoDB and service credentials

---

*Last Updated: February 18, 2026*
*The Turf - Sports Turf Booking Platform*
#   t h e - t u u r f  
 #   t h e - t u u r f  
 
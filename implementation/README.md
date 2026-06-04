# The Turf: Implementation Files

This directory contains the complete implementation files for all 20 sections of the master blueprint.

## Directory Structure

### Frontend (`frontend/`)
- **pages/**: Main application pages
  - `HomePage.tsx` - Landing page
  - `SlotBookingPage.tsx` - Slot booking interface
  - `LiveScoringPage.tsx` - Live scoring dashboard
  - `AdminDashboard.tsx` - Admin panel

- **components/**: Reusable React components
  - Hero sections, forms, cards, etc.

- **services/**: API and Socket.IO client
  - `api.ts` - API client
  - `socket.ts` - Socket.IO connection

- **store/**: Zustand state management
  - `bookingStore.ts` - Booking state
  - `authStore.ts` - Authentication state
  - `matchStore.ts` - Match state

### Backend (`backend/`)
- **models/**: MongoDB schemas
  - `User.ts` - User schema
  - `Booking.ts` - Booking schema
  - `Match.ts` - Match schema
  - `Turf.ts` - Turf schema

- **services/**: Business logic
  - `BookingService.ts` - Booking operations
  - `MatchService.ts` - Match operations
  - `PaymentService.ts` - Payment operations
  - `AIService.ts` - AI features

- **controllers/**: Request handlers
  - `BookingController.ts`
  - `MatchController.ts`
  - `PaymentController.ts`

- **routes/**: API routes
  - `bookings.ts` - Booking endpoints
  - `matches.ts` - Match endpoints
  - `payments.ts` - Payment endpoints

- **sockets/**: Socket.IO handlers
  - Real-time match scoring
  - Commentary broadcasting
  - Notifications

- **config/**: Configuration files
  - `environment.ts` - Environment variables
  - `middleware.ts` - Express middleware
  - `database.ts` - MongoDB connection
  - `redis.ts` - Redis cache

## Section Mapping

### Section 1-2: System Overview & Home Page
- **Files**: `frontend/pages/HomePage.tsx`
- **Features**: Landing page, turf listing, match display

### Section 3: Slot Booking Flow
- **Files**: `frontend/pages/SlotBookingPage.tsx`, `backend/services/BookingService.ts`
- **Features**: Slot selection, calendar, booking creation

### Section 4: Razorpay Payment
- **Files**: `backend/services/PaymentService.ts`, `backend/controllers/PaymentController.ts`
- **Features**: Order creation, payment verification, refunds

### Section 5-6: Match Creation & Playing XI
- **Files**: `backend/services/MatchService.ts`, `backend/models/Match.ts`
- **Features**: Match creation, player invitation, XI selection

### Section 7: Toss Flow
- **Files**: `backend/services/MatchService.ts` (conductToss method)
- **Features**: Toss simulation, decision tracking

### Section 8-9: Live Scoring & Real-time Updates
- **Files**: `frontend/pages/LiveScoringPage.tsx`, `backend/sockets/index.ts`
- **Features**: Ball-by-ball scoring, real-time broadcasts

### Section 10: Player Profiles
- **Files**: `backend/models/User.ts`, `backend/models/Match.ts`
- **Features**: Profile display, statistics tracking

### Section 11: Tournament System
- **Files**: `backend/models/Tournament.ts` (to be created)
- **Features**: Tournament management, points table

### Section 12: Admin Panel
- **Files**: `frontend/pages/AdminDashboard.tsx`
- **Features**: User management, analytics, reporting

### Section 13: Database Architecture
- **Files**: `backend/models/`, `backend/config/database.ts`
- **Features**: MongoDB schemas, indexes

### Section 14: Socket.IO Architecture
- **Files**: `backend/sockets/index.ts`, `backend/config/redis.ts`
- **Features**: Real-time communication, room management

### Section 15: Security System
- **Files**: `backend/middleware/auth.ts`, `backend/config/middleware.ts`
- **Features**: JWT authentication, RBAC, encryption

### Section 16: AI Features
- **Files**: `backend/services/AIService.ts`
- **Features**: Commentary generation, predictions

### Section 17: Production Deployment
- **Files**: `Dockerfile`, `docker-compose.yml`, `.github/workflows/`
- **Features**: Containerization, CI/CD

### Section 18-20: Documentation & Quick Reference
- **Files**: All code files with inline documentation
- **Reference**: `.turf-master-blueprint.md`

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB 6+
- Redis 7+
- Docker (for containerization)

### Installation

1. **Backend Setup**
```bash
cd implementation/backend
npm install
cp .env.example .env
npm run dev
```

2. **Frontend Setup**
```bash
cd implementation/frontend
npm install
cp .env.example .env
npm run dev
```

### Environment Variables

**.env (Backend)**
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/theturf
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
RAZORPAY_KEY_ID=your-key-id
RAZORPAY_KEY_SECRET=your-key-secret
GEMINI_API_KEY=your-gemini-key
OPENAI_API_KEY=your-openai-key
```

**.env (Frontend)**
```
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SOCKET_URL=http://localhost:5000
```

## API Endpoints

### Bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings/:bookingId` - Get booking
- `GET /api/user/bookings` - User's bookings
- `PUT /api/bookings/:bookingId/cancel` - Cancel booking

### Matches
- `POST /api/matches` - Create match
- `GET /api/matches/:matchId` - Get match
- `POST /api/matches/:matchId/invite-players` - Invite players
- `POST /api/matches/:matchId/playing-xi` - Set Playing XI
- `POST /api/matches/:matchId/toss` - Conduct toss
- `POST /api/matches/:matchId/ball/score` - Score ball
- `GET /api/matches/:matchId/live-score` - Get live score

### Payments
- `POST /api/payments/create-order` - Create payment order
- `POST /api/payments/verify` - Verify payment
- `GET /api/payments/status/:orderId` - Check payment status
- `POST /api/payments/refund/:paymentId` - Refund payment

## Socket.IO Events

### Match Namespace (`/matches`)
- `match:join` - Join match room
- `ball:scored` - Ball scored
- `wicket:taken` - Wicket taken
- `over:completed` - Over completed
- `match:completed` - Match finished

### Commentary Namespace (`/commentary`)
- `commentary:add` - Add commentary
- `commentary:added` - Commentary added (broadcast)

### Notifications Namespace (`/notifications`)
- `notification:new` - New notification
- `notification:read` - Mark as read

## Development Workflow

1. **Create Features**: Implement in services
2. **Add Controllers**: Handle HTTP requests
3. **Setup Routes**: Define API endpoints
4. **Create Components**: Build UI in React
5. **Test**: Write unit and integration tests
6. **Deploy**: Use Docker and CI/CD

## Next Steps

1. Complete remaining models (Tournament, PlayerProfile, etc.)
2. Add authentication routes
3. Implement AI features fully
4. Create comprehensive test suite
5. Setup deployment pipeline
6. Configure monitoring and logging

## Support

For detailed information, refer to `.turf-master-blueprint.md`


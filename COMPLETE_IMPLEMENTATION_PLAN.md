# The Turf - Complete Cricket Tournament Platform Implementation Plan

**Total Duration**: 20 weeks | **6 Development Phases**

---

## Phase 1: Foundation & Core APIs (Weeks 1-4)

### Week 1: Project Setup & Database

**Tasks:**
- [x] Create Prisma schema with 30+ models
- [ ] Setup PostgreSQL database connection
- [ ] Run: `npx prisma migrate dev --name init`
- [ ] Generate Prisma client
- [ ] Setup environment variables (.env)
- [ ] Create base project structure:
  - `backend/models/` - Prisma models (auto-generated)
  - `backend/services/` - Business logic
  - `backend/controllers/` - Route handlers
  - `backend/routes/` - API routes
  - `backend/middleware/` - Auth, validation, error handling
  - `backend/utils/` - Helpers, validators

**Files to Create:**
1. `.env.example` - Environment template
2. `backend/config/database.js` - DB connection
3. `backend/middleware/errorHandler.js` - Global error handling
4. `backend/utils/validators.js` - Input validation
5. `backend/utils/responseHandler.js` - Consistent API responses

---

### Week 2: Authentication & User Management

**API Endpoints:**
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh-token
POST   /api/auth/logout
GET    /api/auth/verify-email
POST   /api/auth/resend-otp
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
POST   /api/auth/session-status (existing auto-logout)
POST   /api/auth/keep-alive (existing auto-logout)

GET    /api/users/:id
PUT    /api/users/:id
GET    /api/users/profile
PUT    /api/users/profile
```

**Files to Create:**
1. `backend/services/authService.js` - Auth logic
2. `backend/services/userService.js` - User management
3. `backend/services/emailService.js` - Email notifications
4. `backend/middleware/auth.js` - JWT verification (update existing)
5. `backend/controllers/authController.js`
6. `backend/controllers/userController.js`
7. `backend/routes/authRoutes.js`
8. `backend/routes/userRoutes.js`

---

### Week 3: Tournament Management APIs

**API Endpoints:**
```
POST   /api/tournaments
GET    /api/tournaments
GET    /api/tournaments/:id
PUT    /api/tournaments/:id
DELETE /api/tournaments/:id
POST   /api/tournaments/:id/publish
POST   /api/tournaments/:id/approve-teams
GET    /api/tournaments/:id/teams
GET    /api/tournaments/:id/leaderboard
```

**Files to Create:**
1. `backend/services/tournamentService.js`
2. `backend/controllers/tournamentController.js`
3. `backend/routes/tournamentRoutes.js`

---

### Week 4: Team & Player Management APIs

**API Endpoints:**
```
POST   /api/teams
GET    /api/teams
GET    /api/teams/:id
PUT    /api/teams/:id
POST   /api/teams/:id/players
GET    /api/teams/:id/players
DELETE /api/teams/:id/players/:playerId
PUT    /api/teams/:id/players/:playerId/role
POST   /api/teams/:id/approve-members

POST   /api/players
GET    /api/players/:id
PUT    /api/players/:id
GET    /api/players/stats
POST   /api/players/:id/join-team
GET    /api/players/:id/achievements
```

**Files to Create:**
1. `backend/services/teamService.js`
2. `backend/services/playerService.js`
3. `backend/controllers/teamController.js`
4. `backend/controllers/playerController.js`
5. `backend/routes/teamRoutes.js`
6. `backend/routes/playerRoutes.js`

---

## Phase 2: Match Management & Live Scoring (Weeks 5-8)

### Week 5: Fixture Generation & Match Setup

**API Endpoints:**
```
POST   /api/fixtures/generate
GET    /api/fixtures/tournament/:tournamentId
GET    /api/fixtures/:id
PUT    /api/fixtures/:id

POST   /api/matches/:id/qr-verify
POST   /api/matches/:id/start
GET    /api/matches/:id
GET    /api/matches/:id/status
```

**Files to Create:**
1. `backend/services/fixtureService.js` - Auto-generate fixtures (league, knockout, hybrid)
2. `backend/services/matchService.js`
3. `backend/controllers/fixtureController.js`
4. `backend/controllers/matchController.js`
5. `backend/routes/fixtureRoutes.js`
6. `backend/routes/matchRoutes.js`

**Fixture Logic:**
- League: Every team plays every other team (nC2 matches)
- Knockout: Round structure with seeding
- Hybrid: League stage → Top N teams → Knockout

---

### Week 6: Toss & Playing XI Management

**API Endpoints:**
```
POST   /api/matches/:id/toss
GET    /api/matches/:id/toss
POST   /api/matches/:id/playing-xi
GET    /api/matches/:id/playing-xi
PUT    /api/matches/:id/playing-xi
```

**Files to Create:**
1. `backend/services/tossService.js`
2. `backend/services/playingXIService.js`
3. `backend/controllers/tossController.js`
4. `backend/routes/matchRoutes.js` (extend)

---

### Week 7: Live Scoring Engine (Core)

**API Endpoints:**
```
POST   /api/matches/:id/innings/:inningsId/overs/:overNumber/ball
GET    /api/matches/:id/live-score
GET    /api/matches/:id/commentary
POST   /api/matches/:id/end-innings
POST   /api/matches/:id/complete
```

**Files to Create:**
1. `backend/services/scoringService.js` - Ball-by-ball logic
2. `backend/services/statsCalculationService.js` - Real-time stats
3. `backend/controllers/scoringController.js`
4. `backend/routes/scoringRoutes.js`

**Key Logic:**
- Validate ball events (runs, wickets, extras)
- Calculate batting/bowling stats in real-time
- Update innings totals
- Handle dismissals with 7 types
- Track extras (wide, no-ball, bye, leg-bye)
- Update match status

---

### Week 8: Socket.IO Integration & Real-Time Updates

**Setup:**
1. Install Socket.IO: `npm install socket.io socket.io-client`
2. Install Redis adapter: `npm install socket.io-redis`
3. Setup Redis connection

**Socket Events:**
```
- match:live-update (ball, runs, wickets)
- match:commentary
- match:stats-update
- match:end-innings
- match:complete
- leaderboard:update
- points-table:update
```

**Files to Create:**
1. `backend/socket/matchSocket.js` - Match events
2. `backend/socket/scoreSocket.js` - Scoring events
3. `backend/socket/leaderboardSocket.js` - Real-time leaderboards
4. `backend/config/socketConfig.js` - Socket setup
5. `client/src/hooks/useMatchSocket.js` - Frontend hook

---

## Phase 3: Analytics & Leaderboards (Weeks 9-11)

### Week 9: Leaderboards & Points Tables

**API Endpoints:**
```
GET    /api/tournaments/:id/leaderboard/orange-cap
GET    /api/tournaments/:id/leaderboard/purple-cap
GET    /api/tournaments/:id/leaderboard/most-sixes
GET    /api/tournaments/:id/leaderboard/most-fours
GET    /api/tournaments/:id/leaderboard/best-strike-rate
GET    /api/tournaments/:id/leaderboard/best-economy
GET    /api/tournaments/:id/leaderboard/most-catches
GET    /api/tournaments/:id/leaderboard/most-stumpings

GET    /api/tournaments/:id/points-table
GET    /api/tournaments/:id/points-table/calculate-nrr
```

**Files to Create:**
1. `backend/services/leaderboardService.js`
2. `backend/services/pointsTableService.js`
3. `backend/controllers/leaderboardController.js`
4. `backend/routes/leaderboardRoutes.js`

**Calculations:**
- Orange Cap: Highest runs with average & strike rate
- Purple Cap: Highest wickets with economy
- NRR: (Runs Scored / Overs Faced) - (Runs Conceded / Overs Bowled)
- Auto-update after every match

---

### Week 10: Match Analytics & Graphs

**API Endpoints:**
```
GET    /api/matches/:id/analytics/run-rate
GET    /api/matches/:id/analytics/partnerships
GET    /api/matches/:id/analytics/fall-of-wickets
GET    /api/matches/:id/analytics/wagon-wheel
GET    /api/matches/:id/analytics/manhattan-chart
GET    /api/matches/:id/analytics/worm-chart
GET    /api/matches/:id/analytics/over-comparison
GET    /api/matches/:id/analytics/player-stats
```

**Files to Create:**
1. `backend/services/analyticsService.js`
2. `backend/controllers/analyticsController.js`
3. `backend/routes/analyticsRoutes.js`

**Graph Data:**
- **Wagon Wheel**: Ball-by-ball run directions
- **Manhattan Chart**: Cumulative runs over time
- **Worm Chart**: Run rate progression
- **Over Comparison**: Runs in each over
- **Fall of Wickets**: Dismissals with timing

---

### Week 11: MVP Engine & Awards

**API Endpoints:**
```
GET    /api/tournaments/:id/awards
GET    /api/tournaments/:id/mvp-engine
POST   /api/tournaments/:id/awards/calculate
GET    /api/players/:id/mvp-score
```

**Files to Create:**
1. `backend/services/mvpService.js`
2. `backend/services/awardService.js`
3. `backend/controllers/awardController.js`
4. `backend/routes/awardRoutes.js`

**MVP Calculation:**
```
MVP Score = (Runs × 1) + (Wickets × 20) + (Catches × 10) + (Run Outs × 10)
```

**Awards (Automatic):**
- Orange Cap (highest runs)
- Purple Cap (highest wickets)
- MVP (highest MVP score)
- Best Captain
- Emerging Player
- Best Batsman
- Best Bowler
- Best Wicket Keeper

---

## Phase 4: Dashboard Development (Weeks 12-15)

### Week 12: Admin Dashboard APIs

**API Endpoints:**
```
GET    /api/admin/dashboard/overview
GET    /api/admin/dashboard/tournaments
GET    /api/admin/dashboard/payments
GET    /api/admin/dashboard/users
POST   /api/admin/tournaments/:id/approve
POST   /api/admin/teams/:id/approve
POST   /api/admin/tournaments/:id/start
GET    /api/admin/reports/tournament/:id
GET    /api/admin/reports/revenue
```

**Files to Create:**
1. `backend/controllers/adminController.js`
2. `backend/routes/adminRoutes.js`

---

### Week 13: Admin Dashboard UI (Next.js)

**Pages:**
1. `/admin/dashboard` - Overview with key metrics
2. `/admin/tournaments` - List, create, edit, approve
3. `/admin/teams` - Team approvals
4. `/admin/payments` - Payment tracking
5. `/admin/users` - User management
6. `/admin/reports` - Revenue, tournament reports

**Components:**
1. `AdminDashboardLayout`
2. `TournamentList`, `TournamentForm`
3. `TeamApprovalPanel`
4. `PaymentTracker`
5. `RevenueChart`

---

### Week 14: Team Captain Dashboard

**Pages:**
1. `/captain/dashboard` - Team overview
2. `/captain/squad` - Team members, roles
3. `/captain/matches` - Fixtures, results
4. `/captain/statistics` - Team stats
5. `/captain/settings` - Team settings

**Components:**
1. `SquadManagement`
2. `FixtureList`
3. `TeamStatistics`

---

### Week 15: Scorer & Spectator Dashboards

**Scorer Dashboard:**
- Match QR verification
- Live scoring interface
- Toss entry
- Playing XI selection
- Ball-by-ball entry
- Match completion

**Spectator Dashboard:**
- Live scores
- Tournament leaderboards
- Team statistics
- Player profiles
- Match analytics
- Video highlights (if integrated)

---

## Phase 5: Advanced Features (Weeks 16-18)

### Week 16: QR System & Payment Integration

**QR Code Features:**
1. Team Join QR Code (TEAM_JOIN_XXXX)
2. Match Verification QR Code (MATCH_QR_XXXX)

**API Endpoints:**
```
GET    /api/teams/:id/qr-code
POST   /api/teams/:id/scan-qr
GET    /api/matches/:id/qr-code
POST   /api/matches/:id/verify-qr

POST   /api/payments/razorpay/create-order
POST   /api/payments/razorpay/verify-payment
GET    /api/payments/history
POST   /api/payments/refund/:id
```

**Payment Methods:**
- Razorpay (main)
- UPI
- PhonePe
- Google Pay
- Paytm
- Credit/Debit Card

**Files to Create:**
1. `backend/services/qrService.js` - QR generation & verification
2. `backend/services/paymentService.js` - Payment processing
3. `backend/controllers/paymentController.js`
4. `backend/routes/paymentRoutes.js`

---

### Week 17: Notifications System

**Notification Types:**
1. Push Notifications (Firebase FCM)
2. SMS (Twilio)
3. WhatsApp (WhatsApp Business API)
4. Email (SendGrid/Nodemailer)

**Trigger Events:**
- Match start/end
- Toss complete
- Team approved
- Registration approved
- Match result
- Award winner
- Payment received
- Custom notifications

**API Endpoints:**
```
POST   /api/notifications/send
GET    /api/notifications
PUT    /api/notifications/:id/read
DELETE /api/notifications/:id
GET    /api/notifications/preferences
PUT    /api/notifications/preferences
```

**Files to Create:**
1. `backend/services/notificationService.js`
2. `backend/services/fcmService.js` - Firebase
3. `backend/services/smsService.js` - Twilio
4. `backend/services/emailService.js` - Email
5. `backend/controllers/notificationController.js`
6. `backend/routes/notificationRoutes.js`

---

### Week 18: QR Scanner & Advanced UI Features

**QR Scanner Implementation:**
1. Camera permission handling
2. QR code scanning (jsQR library)
3. Audio feedback on scan
4. Error handling

**Advanced Features:**
1. Team joining via QR
2. Match verification via QR
3. Player statistics export
4. Tournament reports PDF
5. Match highlights gallery
6. Tournament schedule export

**Files to Create:**
1. `client/src/components/QRScanner.jsx`
2. `client/src/pages/scanner.jsx`
3. `client/src/utils/qrParser.js`

---

## Phase 6: Testing & Optimization (Weeks 19-20)

### Week 19: Backend Testing & Optimization

**Testing:**
- Unit tests (Jest): All services
- Integration tests: API endpoints
- Socket.IO tests: Real-time events
- Database tests: Prisma queries

**Performance:**
- Add database indexes (already in schema)
- Optimize Socket.IO with Redis adapter
- Implement API caching (Redis)
- Pagination for large datasets
- Query optimization

**Files to Create:**
1. `backend/tests/` - Test suites
2. `backend/config/redisCache.js` - Caching

---

### Week 20: Frontend Testing & Deployment Prep

**Testing:**
- Component tests (React Testing Library)
- E2E tests (Cypress)
- Performance audit

**Deployment Checklist:**
- [ ] Environment variables setup
- [ ] Database migrations
- [ ] Redis setup
- [ ] Firebase FCM setup
- [ ] Twilio setup
- [ ] Razorpay setup
- [ ] AWS S3 setup (image storage)
- [ ] Email service setup
- [ ] Socket.IO production config
- [ ] Rate limiting
- [ ] CORS setup
- [ ] SSL certificates

---

## API Modules Summary

### 1. Authentication Module
- User registration, login, logout
- JWT token refresh
- OTP verification
- Password reset
- Multi-device session management (auto-logout)

### 2. Tournament Module
- Create, read, update, delete tournaments
- Tournament approval workflow
- Team registration approval
- Fixture generation (league, knockout, hybrid)
- Tournament status management

### 3. Team Module
- Team creation & management
- Squad management (25 players max)
- Player role assignment
- Join code generation
- Team QR code generation

### 4. Player Module
- Player profile creation
- Statistics tracking
- Achievement badges
- Career history

### 5. Match Module
- Match scheduling
- QR verification
- Status management
- Match completion
- Result recording

### 6. Fixture Module
- Auto-generate fixtures
- Match scheduling
- Fixture updates
- Schedule export

### 7. Scoring Module
- Ball-by-ball entry
- Runs, wickets, extras tracking
- Dismissal recording (7 types)
- Innings management
- Live score updates

### 8. Leaderboard Module
- Orange Cap (highest runs)
- Purple Cap (highest wickets)
- Most Sixes / Fours
- Best Strike Rate / Economy
- Most Catches / Stumpings

### 9. Points Table Module
- Auto-calculate standings
- NRR calculation
- Win/Loss tracking
- Team ranking

### 10. Analytics Module
- Run rate analysis
- Partnership tracking
- Fall of wickets
- Wagon wheel charts
- Manhattan charts
- Worm charts

### 11. Award Module
- Award calculation
- MVP engine
- Auto-assign awards

### 12. Payment Module
- Payment processing
- Razorpay integration
- Multiple payment methods
- Receipt generation
- Refund handling

### 13. Notification Module
- Push notifications (FCM)
- SMS (Twilio)
- WhatsApp messages
- Email notifications
- Notification preferences

### 14. QR Module
- QR code generation
- QR code verification
- Team joining via QR
- Match verification via QR

### 15. Admin Module
- Tournament management
- Team approvals
- User management
- Payment tracking
- Report generation

---

## Technology Stack Confirmation

### Backend
- **Framework**: Express.js
- **Language**: TypeScript/JavaScript (Node.js)
- **Database**: PostgreSQL + Prisma ORM
- **Real-time**: Socket.IO + Redis
- **Authentication**: JWT + Refresh Tokens
- **Storage**: AWS S3 / Cloudinary
- **Notifications**: Firebase FCM, Twilio, SendGrid
- **Payments**: Razorpay
- **QR**: QR generation library

### Frontend
- **Framework**: Next.js 15
- **UI Library**: React + ShadCN UI
- **Styling**: Tailwind CSS
- **Real-time**: Socket.IO client
- **Charts**: Chart.js / Recharts
- **QR Scanner**: jsQR
- **Testing**: React Testing Library, Cypress

### Infrastructure
- **Backend Hosting**: AWS EC2 / Railway
- **Frontend Hosting**: Vercel
- **Database**: PostgreSQL (AWS RDS / Railway)
- **Cache**: Redis (AWS ElastiCache / Railway)
- **Monitoring**: Grafana + Prometheus
- **CI/CD**: GitHub Actions

---

## Directory Structure (Complete)

```
the-turf/
├── backend/
│   ├── config/
│   │   ├── database.js
│   │   ├── socketConfig.js
│   │   ├── redisCache.js
│   │   ├── sessionConfig.js
│   │   └── ... (other configs)
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── tournamentController.js
│   │   ├── teamController.js
│   │   ├── playerController.js
│   │   ├── fixtureController.js
│   │   ├── matchController.js
│   │   ├── scoringController.js
│   │   ├── leaderboardController.js
│   │   ├── analyticsController.js
│   │   ├── awardController.js
│   │   ├── paymentController.js
│   │   ├── notificationController.js
│   │   ├── adminController.js
│   │   └── ... (other controllers)
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   ├── validation.js
│   │   ├── activityTracker.js
│   │   └── ... (other middleware)
│   ├── services/
│   │   ├── authService.js
│   │   ├── userService.js
│   │   ├── emailService.js
│   │   ├── sessionService.js
│   │   ├── tournamentService.js
│   │   ├── teamService.js
│   │   ├── playerService.js
│   │   ├── fixtureService.js
│   │   ├── matchService.js
│   │   ├── tossService.js
│   │   ├── playingXIService.js
│   │   ├── scoringService.js
│   │   ├── statsCalculationService.js
│   │   ├── leaderboardService.js
│   │   ├── pointsTableService.js
│   │   ├── analyticsService.js
│   │   ├── mvpService.js
│   │   ├── awardService.js
│   │   ├── paymentService.js
│   │   ├── qrService.js
│   │   ├── notificationService.js
│   │   ├── fcmService.js
│   │   ├── smsService.js
│   │   └── ... (other services)
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── tournamentRoutes.js
│   │   ├── teamRoutes.js
│   │   ├── playerRoutes.js
│   │   ├── fixtureRoutes.js
│   │   ├── matchRoutes.js
│   │   ├── scoringRoutes.js
│   │   ├── leaderboardRoutes.js
│   │   ├── analyticsRoutes.js
│   │   ├── awardRoutes.js
│   │   ├── paymentRoutes.js
│   │   ├── notificationRoutes.js
│   │   ├── adminRoutes.js
│   │   └── ... (other routes)
│   ├── socket/
│   │   ├── matchSocket.js
│   │   ├── scoreSocket.js
│   │   └── leaderboardSocket.js
│   ├── utils/
│   │   ├── validators.js
│   │   ├── responseHandler.js
│   │   ├── logger.js
│   │   └── ... (other utilities)
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── socket/
│   ├── server.js (main entry)
│   ├── package.json
│   └── .env.example
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── index.jsx (public website)
│   │   │   ├── tournament/
│   │   │   ├── admin/
│   │   │   ├── captain/
│   │   │   ├── scorer/
│   │   │   └── ... (other pages)
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   ├── tournament/
│   │   │   ├── match/
│   │   │   ├── scoring/
│   │   │   ├── leaderboard/
│   │   │   ├── QRScanner.jsx
│   │   │   └── ... (other components)
│   │   ├── hooks/
│   │   │   ├── useSessionManager.js
│   │   │   ├── useMatchSocket.js
│   │   │   └── ... (other hooks)
│   │   ├── styles/
│   │   ├── utils/
│   │   └── ... (other client files)
│   ├── package.json
│   └── ... (Next.js config files)
├── prisma/
│   ├── schema.prisma ✅ (CREATED)
│   └── migrations/ (auto-generated)
├── docker-compose.yml (PostgreSQL, Redis setup)
├── .env.example
├── README.md
└── ... (other root files)
```

---

## Key Implementation Tips

### Database Setup
1. Create PostgreSQL database
2. Add `DATABASE_URL` to `.env`
3. Run: `npx prisma migrate dev --name init`
4. Models auto-generated in `node_modules/@prisma/client`

### Real-Time Setup
1. Setup Redis (local or cloud)
2. Configure Socket.IO with Redis adapter
3. Use rooms for match-specific updates
4. Implement reconnection handling

### Security
1. Validate all inputs
2. Use parameterized queries (Prisma handles this)
3. Hash passwords with bcrypt
4. Implement rate limiting
5. Validate JWT tokens
6. CORS configuration

### Performance
1. Use database indexes (already in schema)
2. Implement caching for frequently accessed data
3. Pagination for list endpoints
4. Lazy loading for images
5. Compress API responses

### Testing
1. Unit tests for services
2. Integration tests for APIs
3. Socket.IO event tests
4. E2E tests for critical flows

---

## Next Immediate Steps

1. **Setup PostgreSQL**: Create database, add DATABASE_URL to .env
2. **Run Migrations**: `npx prisma migrate dev --name init`
3. **Week 1 Files**: Create config, middleware, utils
4. **Week 2 Start**: Begin Auth APIs implementation
5. **Parallel**: Setup Docker Compose for PostgreSQL + Redis

This plan is now **100% detailed** and ready for execution!

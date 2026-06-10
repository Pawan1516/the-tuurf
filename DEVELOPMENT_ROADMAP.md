# 🏏 The Turf - Complete Development Roadmap

## Overview
This document outlines the complete development plan for building a production-ready cricket tournament management platform comparable to CricHeroes and CREX.

---

## 📊 Development Architecture

### Technology Stack
```
Frontend:  Next.js 15 + React + TypeScript + Tailwind + ShadCN UI
Backend:   Node.js + Express.js + TypeScript
Database:  PostgreSQL + Prisma ORM
Real-Time: Socket.IO + Redis
Storage:   AWS S3 + Cloudinary
Payments:  Razorpay + UPI
Notifications: Firebase FCM + Twilio + WhatsApp API
```

---

## 🗂️ Development Phases

### Phase 1: Foundation (Database & APIs) - Weeks 1-4
**Goal**: Build the data layer and core API endpoints

#### 1.1 Database Schema (Prisma Models)
Files to create:
- `prisma/schema.prisma` - Complete schema with all models
- Database migrations

Core Models:
- User (with roles: SuperAdmin, TournamentAdmin, TeamCaptain, Player, Scorer, Umpire, Spectator)
- Tournament (League, Knockout, League+Knockout)
- Team (with jersey, logo, QR code)
- Player (with statistics, achievements)
- TeamPlayer (joining relationship with roles)
- Tournament Registration (teams + payments)
- Fixture (auto-generated schedule)
- Match (with innings, overs, balls)
- Scoring (runs, wickets, extras)
- Leaderboards (Orange Cap, Purple Cap, etc)
- Awards (automatic calculations)
- Notifications
- Payments

#### 1.2 Core API Modules
- **Authentication API** (`/api/auth`)
  - Register, Login, Refresh Token
  - Role-based access control
  - JWT tokens with auto-logout (already implemented)

- **Tournament API** (`/api/tournaments`)
  - Create tournament
  - List tournaments
  - Get tournament details
  - Update tournament
  - Get tournament statistics

- **Team API** (`/api/teams`)
  - Create team
  - Join team (via QR or code)
  - Manage squad
  - Get team statistics
  - Team roster

- **Player API** (`/api/players`)
  - Create player profile
  - Update player stats
  - Get player statistics
  - Player achievements

- **Fixture API** (`/api/fixtures`)
  - Generate fixtures (auto-scheduler)
  - Get match schedule
  - Update fixture

- **Match API** (`/api/matches`)
  - Get match details
  - Toss management
  - Playing XI selection
  - Get match scorecard

---

### Phase 2: Match Management (Scoring & Live Updates) - Weeks 5-8
**Goal**: Implement real-time scoring and match management

#### 2.1 Live Scoring Engine
- Ball-by-ball scoring
- Runs, extras, dismissals tracking
- Over management
- Innings closure
- Match result calculation

#### 2.2 Socket.IO Real-Time System
- Live score broadcast to spectators
- Commentary updates
- Player statistics sync
- Graph data sync
- Latency target: <1 second

#### 2.3 Match QR Verification
- Generate MATCH_QR before each game
- Scorer scans to activate match
- Match locked without scan
- Audit trail

---

### Phase 3: Analytics & Leaderboards - Weeks 9-11
**Goal**: Implement automatic analytics and rankings

#### 3.1 Points Table Engine
- Automatic calculation after each match
- Win/Loss/Tie/NoResult tracking
- Net Run Rate (NRR) calculation
- Points system (Win: 4pts, Tie: 2pts, Loss: 0pts)

#### 3.2 Leaderboards
- Orange Cap (Highest Runs)
- Purple Cap (Highest Wickets)
- Most Sixes
- Most Fours
- Best Strike Rate
- Best Economy Rate
- Most Catches
- Most Stumpings

#### 3.3 MVP Engine
```
MVP Score = (Runs × 1) + (Wickets × 20) + (Catches × 10) + (Run Outs × 10)
```
- Auto-calculated after each match
- Updated leaderboard rankings

#### 3.4 Advanced Analytics Graphs
- Wagon Wheel (shot placement)
- Worm Graph (run accumulation)
- Manhattan Chart (runs per over)
- Over Comparison
- Partnership graphs
- Fall of Wickets visualization

---

### Phase 4: Dashboards & User Interfaces - Weeks 12-15
**Goal**: Build role-specific dashboards

#### 4.1 Admin Dashboard
- Tournament management
- Team approvals
- Fixture generation
- Scorer & Umpire management
- Payment management
- Analytics & reports
- Award management

#### 4.2 Tournament Admin Dashboard
- Create tournaments
- Approve teams
- Generate fixtures
- Manage scorers
- View reports

#### 4.3 Captain Dashboard
- Team management
- Squad selection
- Playing XI selection
- Tournament registration
- Payment tracking

#### 4.4 Scorer Dashboard
- Match QR verification
- Live scoring interface
- Toss management
- Playing XI confirmation
- Scorecard submission

#### 4.5 Umpire Dashboard
- Match verification
- Decision confirmation
- Result approval
- Scorecard review

#### 4.6 Spectator Portal
- Live match center
- Team profiles
- Player statistics
- Leaderboards
- Tournament standings
- Match history

---

### Phase 5: Advanced Features - Weeks 16-18
**Goal**: Add payments, QR system, and notifications

#### 5.1 QR System
- Team QR generation
- QR scanning for team joining
- Match QR generation
- Audit trail

#### 5.2 Payment Integration
- Razorpay integration
- UPI support
- Payment receipt generation
- Invoice management
- Refund processing

#### 5.3 Notification System
- Push notifications (Firebase FCM)
- SMS notifications (Twilio)
- WhatsApp notifications
- Email notifications
- Event-based triggers:
  - Match start
  - Toss complete
  - Team approved
  - Registration approved
  - Match result
  - Award winner

---

### Phase 6: Testing & Optimization - Weeks 19-20
**Goal**: Ensure quality and performance

#### 6.1 Testing
- Unit tests (Jest)
- API testing (Postman/Insomnia)
- E2E testing (Cypress)
- Performance testing
- Load testing (k6)

#### 6.2 Optimization
- Database query optimization
- API response caching
- Image optimization
- Frontend bundle optimization
- Socket.IO performance tuning

---

## 📋 Detailed Implementation Order

### Priority 1: Database & Core APIs (Foundation)
```
Week 1-2: Database Schema
├─ User models (with roles)
├─ Tournament models
├─ Team & Player models
├─ Match & Scoring models
└─ Leaderboard models

Week 3-4: Core APIs
├─ Authentication API
├─ Tournament CRUD
├─ Team Management
├─ Player Management
└─ Fixture Generation
```

### Priority 2: Match Management & Live Scoring
```
Week 5-6: Scoring Engine
├─ Ball-by-ball scoring
├─ Dismissal tracking
├─ Over management
└─ Match result calculation

Week 7-8: Real-Time System
├─ Socket.IO setup
├─ Live score broadcast
├─ Commentary sync
└─ Performance optimization
```

### Priority 3: Analytics
```
Week 9: Points & Leaderboards
├─ Automatic points calculation
├─ NRR calculation
├─ Leaderboard rankings
└─ Award calculations

Week 10-11: Advanced Analytics
├─ Wagon wheel graphs
├─ Worm charts
├─ Manhattan charts
└─ Statistics dashboard
```

### Priority 4: User Interfaces
```
Week 12: Admin & Captain Dashboards
├─ Admin panel
├─ Tournament management
├─ Captain squad management
└─ Registration tracking

Week 13: Scorer & Umpire UIs
├─ Live scoring interface
├─ Toss management
├─ Playing XI selection
└─ Decision confirmation

Week 14-15: Spectator Portal
├─ Tournament home page
├─ Live match center
├─ Team & player profiles
├─ Leaderboards & standings
```

### Priority 5: Advanced Features
```
Week 16: QR System & Payments
├─ QR generation & scanning
├─ Razorpay integration
├─ UPI payment flow
└─ Receipt generation

Week 17: Notifications
├─ Push notifications
├─ SMS notifications
├─ WhatsApp integration
└─ Email notifications

Week 18: Additional Features
├─ Sponsorship management
├─ Gallery/Media
├─ Social sharing
└─ User achievements
```

### Priority 6: Testing & Deployment
```
Week 19-20: Testing & Optimization
├─ Unit tests
├─ API tests
├─ E2E tests
├─ Performance tuning
└─ Security audit
```

---

## 🗄️ Database Schema Overview

### Core Tables
```sql
-- Users & Authentication
users (id, email, phone, role, profile)
admin_roles (user_id, tournament_id, role)

-- Tournaments
tournaments (name, type, format, dates, fees)
tournament_teams (tournament_id, team_id, status)
tournament_registrations (tournament_id, team_id, payment_id, status)

-- Teams & Players
teams (name, logo, city, jersey, captain_id)
players (user_id, team_id, role, stats)
team_players (team_id, player_id, role, status)

-- Fixtures & Matches
fixtures (tournament_id, match_number, date, time)
matches (fixture_id, team_a_id, team_b_id, status)
innings (match_id, batting_team_id, bowling_team_id)
overs (innings_id, over_number)
balls (over_id, ball_number, runs, extras, dismissal)

-- Scoring & Statistics
player_statistics (player_id, runs, wickets, catches)
match_statistics (match_id, team_id, runs, wickets)
leaderboards (tournament_id, player_id, runs, wickets, rank)
points_table (tournament_id, team_id, matches, wins, points, nrr)

-- Awards & Notifications
awards (tournament_id, award_type, player_id, team_id)
notifications (user_id, type, message, status)
payments (tournament_id, team_id, amount, status)
```

---

## 🔌 API Endpoints Structure

### Authentication
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/profile
```

### Tournaments
```
POST   /api/tournaments
GET    /api/tournaments
GET    /api/tournaments/:id
PUT    /api/tournaments/:id
POST   /api/tournaments/:id/register
GET    /api/tournaments/:id/standings
GET    /api/tournaments/:id/leaderboards
```

### Teams
```
POST   /api/teams
GET    /api/teams
GET    /api/teams/:id
PUT    /api/teams/:id
POST   /api/teams/:id/join
GET    /api/teams/:id/players
POST   /api/teams/:id/players/:playerId/approve
```

### Players
```
GET    /api/players/:id
PUT    /api/players/:id
GET    /api/players/:id/statistics
GET    /api/players/:id/achievements
```

### Matches & Scoring
```
GET    /api/matches/:id
POST   /api/matches/:id/toss
POST   /api/matches/:id/start
POST   /api/matches/:id/score
GET    /api/matches/:id/scorecard
POST   /api/matches/:id/complete
```

### Leaderboards & Analytics
```
GET    /api/leaderboards/orange-cap
GET    /api/leaderboards/purple-cap
GET    /api/leaderboards/batting
GET    /api/leaderboards/bowling
GET    /api/statistics/:playerId
```

---

## 🚀 Deployment & Infrastructure

### Frontend Deployment
- **Vercel** (Next.js optimized)
- Environment: Production, Staging, Development
- CI/CD: GitHub Actions

### Backend Deployment
- **AWS EC2** or **Railway**
- Docker containerization
- Environment variables management
- Database backups

### Database
- **PostgreSQL** on AWS RDS or Railway
- Automated backups
- Read replicas for scaling

### Caching
- **Redis** for session storage
- Socket.IO message queue
- Rate limiting

### Monitoring
- **Grafana** for dashboards
- **Prometheus** for metrics
- **Sentry** for error tracking
- **LogRocket** for frontend monitoring

---

## 🔐 Security Considerations

- ✅ JWT authentication (with auto-logout - already implemented)
- IP whitelisting for admin
- Rate limiting on API endpoints
- SQL injection prevention (Prisma)
- XSS protection
- CORS configuration
- Password hashing (bcrypt)
- Refresh token rotation
- Audit logging

---

## 📈 Scalability Strategy

### Database
- Connection pooling
- Query optimization
- Indexing strategy
- Read replicas for reports

### Backend
- Horizontal scaling with load balancer
- Stateless design
- Redis for distributed caching
- Message queue for async jobs

### Frontend
- CDN for static assets
- Image optimization
- Lazy loading
- Code splitting

### Real-Time
- Redis Pub/Sub for Socket.IO scaling
- Sticky sessions for WebSocket
- Connection pooling

---

## 📚 Documentation Structure

```
docs/
├─ API Documentation (Swagger/OpenAPI)
├─ Database Schema Documentation
├─ Architecture Guide
├─ Deployment Guide
├─ Contributing Guidelines
└─ User Guides
   ├─ Admin Guide
   ├─ Captain Guide
   ├─ Scorer Guide
   └─ Spectator Guide
```

---

## ✅ Quality Metrics

- **Code Coverage**: >80%
- **API Response Time**: <200ms
- **Real-Time Latency**: <1 second
- **Database Query Time**: <100ms
- **Uptime**: 99.9%
- **Mobile Performance**: >90 Lighthouse score

---

## 🎯 Success Criteria

✅ Support 1000+ concurrent live matches  
✅ <1 second real-time score updates  
✅ Automatic leaderboard & points calculations  
✅ Multi-platform support (Web, iOS, Android)  
✅ Payment integration fully functional  
✅ Notification system reliable  
✅ QR-based team joining working  
✅ Role-based dashboards for all users  

---

## 📞 Next Steps

1. **Review & Approve** this roadmap
2. **Setup Development Environment** (PostgreSQL, Redis, Node.js)
3. **Start Phase 1** with database schema
4. **Implement Core APIs** with proper testing
5. **Continue with subsequent phases**

---

**Document Version**: 1.0  
**Last Updated**: June 8, 2026  
**Status**: Ready for Implementation ✅

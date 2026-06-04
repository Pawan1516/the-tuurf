# 📋 The Turf - Complete Blueprint Structure

## ✅ Complete Architecture

### Core Modules

#### 1. ✅ System Overview
- Product Vision
- Technology Stack
- Core Features

#### 2. ✅ Home Page
- Landing Page
- Featured Turfs
- Upcoming Matches
- Navigation

#### 3. ✅ Slot Booking Flow
- Turf Search & Filter
- Slot Calendar
- Slot Details
- Booking Summary

#### 4. ✅ Razorpay Payment
- Payment Processing
- Payment Status
- Refund Policy
- Security Features

#### 5. ✅ Match Creation
- Match Setup Wizard
- Player Invitation (Phone-based)
- Match Rules Configuration
- Team Assignment

#### 6. ✅ Playing XI Selection
- Player Selection Interface
- Role Assignment
- Batting Order Setup
- Captain Confirmation

#### 7. ✅ Toss Page (NEW)
- Coin Flip Animation
- Captain Calls
- Toss Result Display
- Real-time Events

#### 8. ✅ Bat or Ball (NEW)
- Decision Modal
- Batting Decision
- Bowling Decision
- Team Assignment

#### 9. ✅ Striker Selection (NEW)
- Opening Batsman Selection
- Player Statistics
- Position Confirmation
- Ready for First Ball

#### 10. ✅ Non-Striker Selection (NEW)
- Opening Partner Selection
- Partnership Analysis
- Player Comparison
- Opening Pair Ready

#### 11. ✅ Bowler Selection (NEW)
- Opening Bowler Selection
- Bowling Strategy
- Field Placement Setup
- Match Ready Status

#### 12. ✅ Live Scoring (NEW)
- Ball-by-Ball Scoring
- Run Tracking
- Wicket Management
- Real-time Updates
- Commentary Feed

---

## 🔄 Complete Match Flow

```
HOME PAGE
   ↓
SLOT BOOKING → PAYMENT (Razorpay)
   ↓
MATCH CREATION → PLAYER INVITATION
   ↓
PLAYING XI SELECTION (Both Teams)
   ↓
TOSS PAGE
   ↓
BAT OR BALL DECISION
   ↓
STRIKER SELECTION
   ↓
NON-STRIKER SELECTION
   ↓
BOWLER SELECTION
   ↓
LIVE SCORING → COMMENTARY → MATCH COMPLETION
```

---

## 📊 Page Components Breakdown

### Page 1: System Overview
- **Purpose**: Platform architecture & vision
- **Components**: Product vision, tech stack, core features
- **Status**: ✅ Complete

### Page 2: Home Page
- **Purpose**: User acquisition & navigation
- **Components**: Hero section, featured turfs, upcoming matches, statistics
- **Status**: ✅ Complete

### Page 3: Slot Booking Flow
- **Purpose**: Turf discovery & booking
- **Components**: Search, calendar, details, booking summary
- **Status**: ✅ Complete

### Page 4: Razorpay Payment
- **Purpose**: Secure payment processing
- **Components**: Order creation, payment modal, verification, webhooks
- **Status**: ✅ Complete

### Page 5: Match Creation
- **Purpose**: Match setup & player connection
- **Components**: Match wizard, player invitation via phone, team assignment
- **Status**: ✅ Complete

### Page 6: Playing XI Selection
- **Purpose**: Select 11 players per team
- **Components**: Player selection, role assignment, batting order, captain confirmation
- **Status**: ✅ Complete

### Page 7: Toss Page ⭐ NEW
- **Purpose**: Coin toss & decision
- **Components**: Coin flip animation, captain calls, toss result display
- **Real-time Events**: Toss started, called, result, completed
- **Status**: ✅ Complete

### Page 8: Bat or Ball ⭐ NEW
- **Purpose**: Toss winner decides play order
- **Components**: Decision modal, bat/bowl buttons, team assignment display
- **Real-time Events**: Decision awaited, made, locked
- **Status**: ✅ Complete

### Page 9: Striker Selection ⭐ NEW
- **Purpose**: Select opening batsman
- **Components**: Player selection interface, player stats card, position indicator
- **Real-time Events**: Selection started, selected, confirmed
- **Status**: ✅ Complete

### Page 10: Non-Striker Selection ⭐ NEW
- **Purpose**: Select opening partner
- **Components**: Partner selection, partnership analysis, historical stats
- **Real-time Events**: Selection started, selected, confirmed, pair ready
- **Status**: ✅ Complete

### Page 11: Bowler Selection ⭐ NEW
- **Purpose**: Select opening bowler
- **Components**: Bowler selection, bowling strategy, field placement setup
- **Real-time Events**: Selection started, selected, confirmed, match ready
- **Status**: ✅ Complete

### Page 12: Live Scoring ⭐ NEW
- **Purpose**: Real-time match scoring
- **Components**: Live scorecard, ball-by-ball input, runs tracking, wicket display, commentary
- **Real-time Events**: Ball scored, runs updated, wicket taken, milestone reached
- **Status**: ✅ Complete

---

## 🔐 Real-time Socket Events

### Toss Events
- `toss:started`
- `toss:called`
- `toss:result`
- `toss:completed`

### Decision Events
- `decision:awaited`
- `decision:made`
- `decision:locked`

### Selection Events
- `striker:selection_started`
- `striker:selected`
- `striker:confirmed`
- `non_striker:selection_started`
- `non_striker:selected`
- `non_striker:confirmed`
- `opening_pair:ready`
- `bowler:selection_started`
- `bowler:selected`
- `bowler:confirmed`

### Match Events
- `match:ready_to_start`
- `match:started`
- `ball:scored`
- `runs:updated`
- `wicket:taken`
- `milestone:reached`
- `over:completed`
- `innings:completed`
- `match:ended`

---

## 🌐 API Endpoints Summary

### Toss APIs
- `POST /api/matches/{id}/toss/start`
- `POST /api/matches/{id}/toss/call`
- `POST /api/matches/{id}/toss/result`
- `GET /api/matches/{id}/toss/status`

### Decision APIs
- `POST /api/matches/{id}/decision/make`
- `GET /api/matches/{id}/decision/status`
- `PUT /api/matches/{id}/decision/confirm`

### Striker/Non-Striker APIs
- `GET /api/matches/{id}/playing-xi/batting`
- `POST /api/matches/{id}/striker/select`
- `PUT /api/matches/{id}/striker/confirm`
- `GET /api/matches/{id}/striker/status`
- `GET /api/matches/{id}/playing-xi/available`
- `POST /api/matches/{id}/non-striker/select`
- `PUT /api/matches/{id}/non-striker/confirm`

### Bowler APIs
- `GET /api/matches/{id}/playing-xi/bowlers`
- `POST /api/matches/{id}/bowler/select`
- `PUT /api/matches/{id}/bowler/confirm`
- `POST /api/matches/{id}/field/setup`
- `GET /api/matches/{id}/match-status/pre-start`

### Live Scoring APIs
- `POST /api/matches/{id}/balls/record`
- `PUT /api/matches/{id}/balls/{ballId}`
- `GET /api/matches/{id}/scorecard`
- `POST /api/matches/{id}/wickets`
- `GET /api/matches/{id}/live-commentary`

---

## 🎯 Data Models

### Toss Object
```javascript
{
  matchId: ObjectId,
  tossTime: timestamp,
  tossWinner: { teamId, captain, captainName },
  tossCall: { calledBy, call, actualResult, isCorrect },
  tossCompletedAt: timestamp,
  status: 'pending' | 'in_progress' | 'completed'
}
```

### Decision Object
```javascript
{
  matchId: ObjectId,
  decision: 'bat' | 'bowl',
  chosenAt: timestamp,
  decidedBy: ObjectId,
  battingTeam: { teamId, teamName },
  bowlingTeam: { teamId, teamName },
  status: 'awaiting_decision' | 'decided' | 'locked'
}
```

### Striker/Non-Striker Object
```javascript
{
  matchId: ObjectId,
  striker: { playerId, playerName, jerseyNumber, battingHand, status },
  nonStriker: { playerId, playerName, jerseyNumber, battingHand, status },
  openingPair: { striker, nonStriker, historicalRuns, previousMatches },
  confirmedAt: timestamp
}
```

### Bowler Object
```javascript
{
  matchId: ObjectId,
  bowler: { playerId, playerName, jerseyNumber, bowlingType, bowlingHand, status },
  bowlingSetup: { bowler, runUpEnd, expectedSpeed, expectedLine },
  confirmedAt: timestamp,
  fieldSetup: { fieldersAssigned, fielderPositions }
}
```

### Live Score Object
```javascript
{
  matchId: ObjectId,
  inningId: ObjectId,
  
  currentScore: {
    runs: Number,
    wickets: Number,
    overs: Number,
    balls: Number
  },
  
  striker: { playerId, runs, ballsFaced, fours, sixes },
  nonStriker: { playerId, runs, ballsFaced, fours, sixes },
  bowler: { playerId, runsGiven, wickets, overs },
  
  ballHistory: [{
    ballNumber, overNumber, bowler, striker,
    runs, wicket, extras, timestamp
  }],
  
  status: 'live' | 'completed'
}
```

---

## ✨ Key Features

### ✅ Pre-Match
- Match creation with easy player invitation
- Playing XI selection with drag-drop interface
- Toss management with coin flip animation
- Bat/Bowl decision capture

### ✅ Live Match
- Real-time ball-by-ball scoring
- Instant wicket notifications
- Live commentary feed
- Partnership tracking
- Milestone celebrations

### ✅ Real-time
- Socket.IO for instant updates
- Multiple room support (scorers, viewers, captains)
- Offline sync capability
- Performance optimized broadcasts

### ✅ User Experience
- Mobile-first responsive design
- Intuitive captain interfaces
- Viewer streaming dashboard
- Live statistics tracking

---

## 📱 Technology Stack

**Frontend**: React, Tailwind CSS, Socket.IO Client, Vite  
**Backend**: Node.js, Express, MongoDB, Socket.IO  
**Payment**: Razorpay API  
**Real-time**: Socket.IO with Redis adapter  
**AI**: Gemini/OpenAI APIs  
**Deployment**: Docker, Kubernetes, Azure

---

## 🎯 Match Progression Timeline

1. **Booking Phase**: User books turf slot → Pays via Razorpay
2. **Setup Phase**: Create match → Invite players → Playing XI selection
3. **Pre-Match**: Toss conducted → Bat/Ball decision → Striker/Non-Striker selection
4. **Match Setup**: Bowler selection → Field placement → Match ready
5. **Live Match**: First ball → Real-time scoring → Innings progression
6. **Completion**: Final score → Statistics → Match summary

---

**Status**: 🟢 All 12 pages complete and integrated  
**Last Updated**: May 29, 2026  
**Version**: 1.0 - Complete Blueprint

# Nero Party - Technical Context

> **Purpose**: This document provides critical context for LLM instances working on this codebase. It focuses on complex/non-obvious implementation details, architectural decisions, and important gotchas.

---

## 🏗️ Architecture Overview

### Tech Stack
- **Backend**: Express + Socket.IO + Prisma + SQLite + TypeScript
- **Frontend**: React + Vite + Tailwind + Zustand + Socket.IO Client + TypeScript
- **Real-time**: Socket.IO for bidirectional WebSocket communication
- **Database**: SQLite with Prisma ORM (ephemeral, in-memory during dev)

### Key Design Principle
**Incremental, safe changes**: Every modification must maintain backward compatibility. App must work at every commit.

---

## 🎮 Scoring System (Most Complex Part)

### Formula (Arcade-Inspired)
```
TimeScore = (playedSeconds / songDurationSeconds) × 100
VoteMultiplier = starts at 1.0, compounds on EVERY vote:
  🔥 Play (5) → ×1.04 (+4%)
  👍 Keep (4) → ×1.02 (+2%)
  😐 Meh (2)  → ×0.98 (-2%)
  ⛔ Cut (1)  → ×0.94 (-6%)

FinalScore = clamp(0, 100, TimeScore × VoteMultiplier)
```

### Implementation Strategy
- **Pure functions** in `backend/src/scoring.ts` (testable, isolated)
- **In-memory state** via `Map<songId, SongScoringState>` in `backend/src/index.ts`
- **Database persistence** only when songs end (nullable fields: `voteMultiplier`, `finalScore`)
- **Backward compatibility** via fallback to old `averageScore` in winner calculation

### Critical Files
- `backend/src/scoring.ts` - Pure scoring logic (27 unit tests)
- `backend/src/index.ts` - State tracking (lines 41-49), vote updates (697-707), score capture (3 locations)
- `backend/src/utils.ts` - Winner selection with fallback (lines 82-97)
- `frontend/src/utils/scoring.ts` - Client-side score projection for live display

### Gotchas
1. **Three song-ending locations**: Vote threshold cut, natural end (`song:next`), manual skip - all must calculate/save FinalScore
2. **Multiplier compounds**: Don't recalculate from votes array, update incrementally on each vote
3. **Nullable fields**: Always check `finalScore !== undefined` before using
4. **Time calculation**: `playedSeconds = (Date.now() - startedAt) / 1000` - capture when song ends, not during

---

## 🔌 Socket.IO Event Architecture

### Party Lifecycle States
```
lobby → active → ended
```
State transitions controlled by `party.status` in database + real-time Socket.IO broadcasts.

### Critical Events (15+ total)

#### **Party Management**
- `party:create` - Generates 6-char code, creates DB record, returns party + host user
- `party:join` - Validates code, adds participant, broadcasts `party:updated`
- `party:start` - Transitions lobby→active, starts first song, broadcasts `party:started`
- `party:end` - Calculates winner, transitions active→ended, broadcasts `party:ended`

#### **Song Playback** (Complex Flow)
- `song:next` - Called by YouTube player `onEnd` OR manually by host
  - Marks current song as played
  - Calculates FinalScore (if in active state)
  - Queues next song
  - Broadcasts `song:playing` with new current song
  - **Debounce protection**: 2-second window to prevent double-triggers

- `song:skip` - Host-only manual skip
  - Same flow as `song:next` but marks as skipped
  - Still calculates FinalScore (partial time played counts)

- `song:playing` - Broadcast to all clients with song metadata + server timestamp
  - Clients sync YouTube player to server time
  - Critical for synchronized playback

- `song:sync:broadcast` - Server sends every 10 seconds
  - Clients use this to stay in sync if they drift
  - Contains: `playedSeconds`, `timestamp`

#### **Voting** (Complex State Management)
- `song:vote` - Upsert vote in DB
  - Updates in-memory `voteMultiplier` immediately
  - Checks vote threshold: if 50%+ vote Cut (score=1), song ends early
  - Broadcasts `party:updated` with new vote counts (if live visibility)
  - **Important**: Each vote changes multiplier, not just new votes

#### **Participant Management**
- `participant:kick` - Host-only
  - Marks participant as kicked in DB
  - Broadcasts `participant:kicked` to specific socket
  - Client auto-leaves and resets state

### Socket.IO Gotchas
1. **Reconnection handling**: Client automatically reconnects, but must rejoin room (`socket.join(partyCode)`)
2. **Race conditions**: Use database as source of truth, not socket state
3. **Server timestamps**: Always send server timestamp for time-sensitive events (playback sync)
4. **Broadcast vs Emit**: Use `io.to(partyCode).emit()` for room broadcasts, not `socket.broadcast.emit()`

---

## 🎵 YouTube Player Integration

### Player Configuration
```typescript
{
  videoId: song.videoId,
  playerVars: {
    autoplay: 1,
    controls: 0,
    disablekb: 1,
    fs: 0,
    modestbranding: 1,
    rel: 0,
  },
}
```

### Synchronization Strategy
- **Server is source of truth** for playback time
- Client receives `song:playing` with `startedAt` timestamp
- Client calculates: `elapsed = (Date.now() - startedAt) / 1000`
- Client seeks YouTube player to `elapsed` seconds
- **10-second sync broadcasts** keep clients aligned

### Mobile Autoplay Issue
- iOS Safari and Chrome Mobile block autoplay until user interaction
- **Not fixable** - browser security policy
- **Workaround**: User taps screen once during first song, enables autoplay for session
- See README.md "Known Limitations" for detailed explanation

### Arcade Text Overlay
- Appears every 10 seconds during playback
- 15-second delay before first message (prevents showing too early)
- Messages: "🔥 ON FIRE!", "⚡ EPIC!", "🌟 LEGENDARY!", etc.
- Implementation: `frontend/src/components/YouTubePlayer.tsx` (lines 183-258)
- CSS animation: `arcadePulse` in `frontend/src/index.css`

---

## 🎨 Theming & Accessibility

### Color System
- **Semantic tokens**: `text-text-primary`, `text-text-muted`, `bg-accent`, etc.
- **Dark mode**: All semantic tokens have `dark:` variants
- **Critical**: Never use hardcoded colors like `text-white` or `text-gray-400` - invisible in some themes

### Common Pattern
```tsx
// ❌ BAD - invisible in light mode
<span className="text-white">Username</span>

// ✅ GOOD - adapts to theme
<span className="text-text-primary dark:text-dark-text-primary">Username</span>
```

### Files to Check for Accessibility Issues
- All components in `frontend/src/components/`
- All pages in `frontend/src/pages/`
- Modal component especially critical (high contrast requirement)

---

## 🗃️ Database Schema (Prisma)

### Key Models

**Party**
```prisma
model Party {
  code           String   @id           // 6-char uppercase
  status         String                  // "lobby" | "active" | "ended"
  duration       Int?                    // minutes, nullable = unlimited
  songLimit      Int?                    // nullable = unlimited
  voteVisibility String                  // "live" | "hidden"
  participants   Participant[]
  songs          Song[]
  createdAt      DateTime
}
```

**Song**
```prisma
model Song {
  id             String   @id @default(uuid())
  status         String                  // "queued" | "playing" | "played"
  votes          Vote[]
  voteMultiplier Float?                  // NEW: compounded reactions
  finalScore     Float?                  // NEW: 0-100 combined score
  playedAt       DateTime?
}
```

**Vote** (Upsert Pattern)
```prisma
model Vote {
  songId        String
  participantId String
  score         Int                      // 1-5 (Cut, Meh, Keep, Play)

  @@id([songId, participantId])         // Composite key = one vote per user per song
}
```

### Important Queries

**Upsert Vote** (`backend/src/index.ts:689-695`)
```typescript
await prisma.vote.upsert({
  where: {
    songId_participantId: {
      songId: payload.songId,
      participantId: currentUser.id,
    },
  },
  create: { songId, participantId, score },
  update: { score },
});
```

**Winner Calculation** (`backend/src/utils.ts:45-144`)
- Fetches all songs with `include: { votes: true, addedBy: true }`
- Filters: `status === "played"` AND `votes.length >= 2`
- Sorts by `finalScore` (if exists) OR `averageScore` (fallback)
- Returns winner + full standings

---

## 🧪 Testing Strategy

### Backend Tests
- **Location**: `backend/src/__tests__/`
- **Framework**: Jest with ts-jest
- **Focus**: Scoring functions (27 unit tests)
- **Run**: `cd backend && npm test`

### Frontend Tests
- **Location**: `frontend/src/__tests__/`
- **Framework**: Vitest with @testing-library/react
- **Focus**: Component rendering, user interactions
- **Run**: `cd frontend && npm test`

### Manual Testing Checklist
- [ ] Create party, add songs, start party
- [ ] Multiple clients join, vote in real-time
- [ ] Song auto-progression (onEnd callback)
- [ ] Host skip, vote threshold cut
- [ ] Party end, winner calculation, leaderboard display
- [ ] Mobile responsiveness, dark/light theme toggle
- [ ] Reconnection after network drop

---

## 🚨 Common Pitfalls

### 1. **Forgetting Nullable Fields**
```typescript
// ❌ BAD - will crash if finalScore is null
const score = song.finalScore.toFixed(1);

// ✅ GOOD
const score = song.finalScore !== undefined ? song.finalScore.toFixed(1) : "—";
```

### 2. **Socket Room Broadcasting**
```typescript
// ❌ BAD - only sends to others, not current socket
socket.broadcast.emit("party:updated", party);

// ✅ GOOD - sends to entire room
io.to(partyCode).emit("party:updated", party);
```

### 3. **Race Conditions in Song Transitions**
- YouTube `onEnd` can fire multiple times
- **Solution**: 2-second debounce window (`backend/src/index.ts:944-949`)
- Check `party.lastSongTransition` timestamp before processing

### 4. **State Desync After Reconnect**
- Socket disconnects don't clean up DB state
- **Solution**: Client emits `party:join` again on reconnect
- Server re-adds to room, sends fresh party state

### 5. **Vote Multiplier Recalculation**
- **DON'T** recalculate multiplier from votes array
- **DO** update incrementally on each vote event
- Stored in-memory Map, persisted to DB only on song end

---

## 📦 Key Dependencies

### Backend
- `express` - HTTP server
- `socket.io` - WebSocket server
- `@prisma/client` - ORM
- `dotenv` - Environment config
- `cors` - CORS middleware

### Frontend
- `react` + `react-dom` - UI framework
- `socket.io-client` - WebSocket client
- `zustand` - State management (simpler than Redux)
- `framer-motion` - Animations
- `react-youtube` - YouTube IFrame Player wrapper
- `sonner` - Toast notifications
- `qrcode.react` - QR code generation

### Dev Tools
- `typescript` - Type safety
- `vite` - Fast build tool
- `tailwindcss` - Utility CSS
- `prisma` - Schema + migrations
- `jest` + `vitest` - Testing frameworks

---

## 🔧 Development Commands

```bash
# Install all dependencies (root + backend + frontend)
npm install

# Run database migrations
cd backend && npx prisma migrate dev

# Start dev servers (backend:3000 + frontend:5173)
npm run dev

# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# TypeScript check (no build)
cd backend && npx tsc --noEmit
cd frontend && npx tsc --noEmit

# Build for production
cd backend && npm run build
cd frontend && npm run build
```

---

## 📚 Further Reading

- `SCORING_IMPLEMENTATION.md` - Detailed scoring system documentation
- `UI_SCORING_UPDATE.md` - Frontend scoring display implementation
- `ACCESSIBILITY_FIXES.md` - Dark/light mode contrast fixes
- `TESTING.md` - Comprehensive testing guide
- `README.md` - User-facing setup and usage guide

---

## 🆘 When Things Break

### Database Corruption
```bash
cd backend
rm prisma/dev.db
npx prisma migrate dev
```

### Socket Connection Issues
1. Check backend is running on port 3000
2. Check frontend Socket.IO client connects to correct URL
3. Look for CORS errors in browser console
4. Verify firewall/antivirus not blocking WebSockets

### Scoring Not Calculating
1. Check console logs for `🎯 Initialized scoring for song`
2. Verify `songScoringState` Map has entry for current song
3. Confirm votes update multiplier (console logs `🎯 Vote multiplier updated`)
4. Check song ends properly (3 locations: vote threshold, natural end, skip)

### Winner Not Displaying
1. Check `finalScore` and `voteMultiplier` saved to DB (Prisma Studio)
2. Verify winner calculation fallback logic in `backend/src/utils.ts:82-97`
3. Ensure minimum 2 votes requirement met
4. Check `PartyEnded.tsx` receives correct result shape

---

**Last Updated**: February 2026
**Version**: 2.0 (Post-scoring system implementation)

# 🎵 Nero Party

A beautiful real-time listening party web application where friends can join, add songs, and vote on their favorites together.

## ✨ Features

- **Real-time Synchronization**: Socket.IO powers instant updates across all connected clients
- **Party Lobby**: Participants can join and add songs before the party starts
- **YouTube Integration**: Search and play music directly from YouTube
- **Vibe Score Voting**: Unique emoji reaction system (⛔ Cut, 😐 Meh, 👍 Keep, 🔥 Play)
- **Arcade-Style Scoring**: Songs rated by time played × compounding vote multipliers (inspired by VS arcade games)
- **Live or Hidden Votes**: Host decides if votes are shown in real-time or revealed at the end
- **Auto-progression**: Songs automatically advance through the queue
- **Winner Calculation**: Dynamic FinalScore system combining playback time and community votes (0-100 scale)
- **Beautiful UI**: Dark mode with glassmorphism effects and smooth animations
- **Mobile Responsive**: Works seamlessly on all devices

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- YouTube Data API v3 Key (free)

### 1. Get a YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project (or select existing)
3. Enable "YouTube Data API v3"
4. Create credentials → API Key
5. Copy the API key

### 2. Install Dependencies

```bash
npm install
```

This will install dependencies for both backend and frontend.

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
PORT=3000
YOUTUBE_API_KEY=your_actual_api_key_here
```

**Important**: Replace `your_actual_api_key_here` with your actual YouTube API key from step 1.

### 4. Run Database Migrations

```bash
cd backend
npx prisma migrate dev
cd ..
```

This creates the SQLite database with all required tables.

### 5. Start the Application

```bash
npm run dev
```

This starts both the backend server (port 3000) and frontend dev server (port 5173).

### 6. Open the App

Navigate to [http://localhost:5173](http://localhost:5173) in your browser.

## 🎮 How to Use

### Creating a Party

1. Click "Create Party" on the home screen
2. Enter your name
3. Configure party settings:
   - **Duration**: 15min, 30min, 1hr, 2hr, or unlimited
   - **Song Limit**: 10, 20, 50 songs, or unlimited
   - **Vote Visibility**: Live (show votes in real-time) or Hidden (reveal at end)
4. Click "Create Party"
5. Share the 6-character party code with friends

### Joining a Party

1. Click "Join Party" on the home screen
2. Enter your name
3. Enter the 6-character party code
4. Click "Join Party"

### Party Lobby (Before Starting)

- All participants can search and add songs to the queue
- See who's online
- Host clicks "Start Party" when ready (requires at least 1 song)

### Active Party (During Playback)

- Songs play automatically via YouTube IFrame Player
- Vote on each song using the Vibe Score system (1-5)
- See live votes (if enabled by host)
- Songs auto-advance when finished
- Host can manually end the party

### Party Ended (Winner Reveal)

- Winner is displayed with celebration animation
- View final standings with all songs ranked
- See vote breakdowns and party stats

## 🏗️ Tech Stack

### Backend

- **Express.js**: HTTP server
- **Socket.IO**: Real-time WebSocket communication
- **Prisma**: ORM for database management
- **SQLite**: Lightweight database
- **TypeScript**: Type-safe code

### Frontend

- **React 18**: UI framework
- **Vite**: Fast build tool
- **TypeScript**: Type safety
- **TailwindCSS**: Utility-first styling
- **Framer Motion**: Smooth animations
- **Zustand**: Lightweight state management
- **Socket.IO Client**: Real-time communication
- **Sonner**: Toast notifications
- **react-youtube**: YouTube player integration

## 📁 Project Structure

```
nero-party/
├── backend/
│   ├── src/
│   │   ├── index.ts          # Main server with Socket.IO events
│   │   ├── types.ts          # TypeScript type definitions
│   │   ├── utils.ts          # Utility functions (party code gen, winner calc)
│   │   └── env.ts            # Environment configuration
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema
│   │   └── dev.db            # SQLite database (created on migration)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx      # Landing page with create/join
│   │   │   └── PartyRoom.tsx # Main party container
│   │   ├── components/
│   │   │   ├── PartyLobby.tsx     # Lobby state
│   │   │   ├── ActiveParty.tsx    # Active state
│   │   │   ├── PartyEnded.tsx     # Ended state
│   │   │   ├── SongSearch.tsx     # YouTube search
│   │   │   ├── SongQueue.tsx      # Song list display
│   │   │   ├── YouTubePlayer.tsx  # Video player
│   │   │   └── ParticipantList.tsx # User list
│   │   ├── store/
│   │   │   └── partyStore.ts # Zustand state management
│   │   ├── lib/
│   │   │   └── socket.ts     # Socket.IO client setup
│   │   ├── types.ts          # TypeScript types
│   │   ├── App.tsx           # Main app component
│   │   └── index.css         # Global styles
│   └── package.json
├── .env                      # Environment variables
└── package.json              # Root scripts
```

## 🎯 Design Decisions

### Arcade-Inspired Scoring System

Inspired by VS arcade fighting games, songs are scored using a dual-component system:

**Scoring Formula:**
```
TimeScore = (playedSeconds / songDurationSeconds) × 100
VoteMultiplier = starts at 1.0, compounds on EVERY vote:
  🔥 Play → ×1.04 (+4%)
  👍 Keep → ×1.02 (+2%)
  😐 Meh  → ×0.98 (-2%)
  ⛔ Cut  → ×0.94 (-6%)

FinalScore = clamp(0, 100, TimeScore × VoteMultiplier)
```

**Why This Design:**
- **Time-based**: Rewards songs people actually listen to (not just vote and skip)
- **Compounding multipliers**: Each vote matters more as they stack up
- **Arcade feedback**: Visual text pops every 10 seconds during playback ("🔥 ON FIRE!", "⚡ EPIC!")
- **Clear scoring**: 0-100 scale is intuitive and leaderboard-friendly
- **Balanced**: Bad songs get cut early (low TimeScore), great songs survive + get boosted (high multiplier)

### Winner Selection

- **Primary**: FinalScore (0-100 scale combining time + votes)
- **Minimum Votes**: Requires at least 2 votes to be eligible
- **Fallback**: Uses old average score system for backward compatibility

### YouTube over Spotify

- **No OAuth**: Simpler authentication (just API key)
- **Free Tier**: Generous quota (10,000 units/day)
- **Embedded Player**: Built-in IFrame player
- **Wide Availability**: No premium account required

### State Machine

Clear states for predictable behavior:
- **lobby**: Add songs, configure
- **active**: Play music, vote
- **ended**: Show winner

## 🔧 Troubleshooting

### YouTube API Quota Exceeded

If you see errors, you may have hit the daily quota (10,000 units). Each search costs ~100 units. Wait 24 hours or create a new project.

### Songs Not Playing

- Check if YouTube video is available in your region
- Ensure autoplay is enabled in browser
- Try a different song

### Connection Issues

- Ensure both servers are running (`npm run dev`)
- Check browser console for Socket.IO errors
- Verify firewall isn't blocking WebSocket connections

### Database Issues

If database gets corrupted:
```bash
cd backend
rm prisma/dev.db
npx prisma migrate dev
```

## 🚧 Known Limitations

- **Mobile Autoplay Restriction**: Most mobile browsers (iOS Safari, Chrome Mobile) block autoplay until user interacts with the page. This is a browser security policy, not an app limitation. **Workaround**: Users can tap anywhere on the screen during the first song to enable autoplay for the rest of the party. This is a one-time interaction per session.
- **Video Duration**: Not fetched from YouTube API (would cost additional quota units per song). Songs use estimated durations from search results.
- **No Persistent Accounts**: Parties are session-based. No user registration or login system.
- **Party Ephemeral**: Party data is deleted when the backend server restarts (in-memory + SQLite database).

## 📝 License

MIT License - Feel free to use for your own projects!

## 🙏 Acknowledgments

Built with ☕ and 🎵 as a technical assessment project.

---

**Need help?** Open an issue or check the WHATIVEDONE.md for detailed architecture information.

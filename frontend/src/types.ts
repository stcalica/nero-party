// Match backend types
export type PartyStatus = "lobby" | "active" | "ended";
export type SongStatus = "queued" | "playing" | "played";
export type PartyTheme = "default" | "birthday" | "hiphop" | "punk";

export type Party = {
  id: string;
  code: string;
  status: PartyStatus;
  duration: number | null;
  songLimit: number | null;
  voteVisibility: "live" | "hidden";
  theme: PartyTheme;
  birthdayUserId: string | null;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  currentSongId: string | null;
  participants: Participant[];
  songs: Song[];
};

export type Participant = {
  id: string;
  partyId: string;
  name: string;
  socketId: string | null;
  isHost: boolean;
  joinedAt: string;
  lastSeen: string;
};

export type Song = {
  id: string;
  partyId: string;
  addedById: string;
  youtubeId: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: number;
  status: SongStatus;
  orderIndex: number;
  playedAt: string | null;
  createdAt: string;
  addedBy: Participant;
  votes: Vote[];
  serverTimestamp?: number;
  startPosition?: number;
};

export type Vote = {
  id: string;
  songId: string;
  participantId: string;
  score: number; // 1-5
  createdAt: string;
  participant: Participant;
};

export type SongWithStats = {
  songId: string;
  title: string;
  artist: string;
  thumbnail: string;
  youtubeId: string;
  addedByName: string;
  averageScore: number;
  totalVotes: number;
  voteBreakdown: {
    score1: number;
    score2: number;
    score3: number;
    score4: number;
    score5: number;
  };
  // New scoring fields (optional for backward compatibility)
  finalScore?: number; // Combined score (0-100) based on time played and vote reactions
  voteMultiplier?: number; // Compounded vote reactions
};

export type PartyResult = {
  winner: SongWithStats;
  allSongs: SongWithStats[];
};

export type PlaybackSyncData = {
  songId: string;
  currentTime: number;
  serverTimestamp: number;
};

export type PlaybackSeekData = {
  songId: string;
  seekTo: number;
  reason: "cut" | "meh";
};

export type YouTubeSearchResult = {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: {
      medium: {
        url: string;
      };
    };
  };
};

// Vibe Score configuration
export const VIBE_SCORES = [
  { score: 1, emoji: "⛔", label: "Cut", color: "text-red-500" },
  { score: 2, emoji: "😐", label: "Meh", color: "text-gray-400" },
  { score: 3, emoji: "👍", label: "Keep", color: "text-blue-500" },
  { score: 4, emoji: "🔥", label: "Play", color: "text-orange-500" },
] as const;

// Party States
export type PartyStatus = "lobby" | "active" | "ended";
export type SongStatus = "queued" | "playing" | "played";
export type PartyTheme = "default" | "birthday" | "hiphop" | "punk";

// Configuration
export type PartyConfig = {
  duration: number | null; // minutes
  songLimit: number | null;
  voteVisibility: "live" | "hidden";
  theme: PartyTheme;
  birthdayUserId: string | null;
};

// Socket Event Payloads
export type CreatePartyPayload = {
  hostName: string;
  config: PartyConfig;
};

export type JoinPartyPayload = {
  code: string;
  name: string;
};

export type AddSongPayload = {
  partyCode: string;
  song: {
    youtubeId: string;
    title: string;
    artist: string;
    thumbnail: string;
    duration: number;
  };
};

export type VoteSongPayload = {
  songId: string;
  score: number; // 1-5
};

export type StartPartyPayload = {
  partyCode: string;
};

export type EndPartyPayload = {
  partyCode: string;
};

export type SkipSongPayload = {
  partyCode: string;
};

export type KickParticipantPayload = {
  partyCode: string;
  participantId: string;
};

export type SetBirthdayUserPayload = {
  partyCode: string;
  userId: string | null;
};

export type RecreatePartyPayload = {
  previousPartyCode: string;
  config?: PartyConfig;
};

export type PlaybackSyncData = {
  songId: string;
  currentTime: number;
  serverTimestamp: number;
};

export type PlaybackSeekData = {
  songId: string;
  seekTo: number; // Time in seconds to seek to
  reason: "cut" | "meh"; // Why we're seeking
};

// Socket Events (Client → Server)
export type ClientToServerEvents = {
  "party:create": (payload: CreatePartyPayload, callback: (response: any) => void) => void;
  "party:recreate": (payload: RecreatePartyPayload, callback: (response: any) => void) => void;
  "party:join": (payload: JoinPartyPayload, callback: (response: any) => void) => void;
  "party:leave": (partyCode: string) => void;
  "party:start": (payload: StartPartyPayload) => void;
  "party:end": (payload: EndPartyPayload) => void;
  "party:setBirthdayUser": (payload: SetBirthdayUserPayload) => void;

  "song:add": (payload: AddSongPayload, callback: (response: any) => void) => void;
  "song:vote": (payload: VoteSongPayload) => void;
  "song:next": (partyCode: string) => void;
  "song:skip": (payload: SkipSongPayload) => void;

  "participant:kick": (payload: KickParticipantPayload) => void;

  "presence:heartbeat": () => void;
};

// Socket Events (Server → Client)
export type ServerToClientEvents = {
  "party:updated": (party: any) => void;
  "party:started": (party: any) => void;
  "party:ended": (result: any) => void;
  "party:recreated": (party: any) => void;
  "party:hostLeft": () => void;

  "participant:joined": (participant: any) => void;
  "participant:left": (participantId: string) => void;
  "participant:kicked": (participantId: string) => void;
  "participant:list": (participants: any[]) => void;

  "song:added": (song: any) => void;
  "song:playing": (song: any) => void;
  "song:ended": (songId: string) => void;
  "song:queue": (songs: any[]) => void;

  "vote:updated": (data: { songId: string; votes: any[] }) => void;

  "playback:sync": (data: PlaybackSyncData) => void;
  "playback:skip": (data: { songId: string; reason: string }) => void;
  "playback:seek": (data: PlaybackSeekData) => void;

  "error": (message: string) => void;
  "sync:state": (state: any) => void;
};

// Winner Calculation
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
  finalScore?: number; // Computed score combining time played and vote reactions
  voteMultiplier?: number; // Compounded vote reactions
};

export type PartyResult = {
  winner: SongWithStats;
  allSongs: SongWithStats[];
};

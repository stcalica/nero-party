import express from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import cors from "cors";
import { env } from "./env.js";
import {
  prisma,
  generatePartyCode,
  calculatePartyResult,
  checkPartyAutoEnd,
  getNextQueuedSong,
} from "./utils.js";
import {
  updateVoteMultiplier,
  computeTimeScore,
  computeFinalScore,
} from "./scoring.js";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  CreatePartyPayload,
  JoinPartyPayload,
  AddSongPayload,
  VoteSongPayload,
  StartPartyPayload,
  EndPartyPayload,
  SkipSongPayload,
  KickParticipantPayload,
  RecreatePartyPayload,
  SetBirthdayUserPayload,
  PlaybackSeekData,
} from "./types.js";

const app = express();
const server = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// Track song transitions to prevent race conditions from duplicate song:next calls
// Maps party code to timestamp of last transition start
const songTransitionsInProgress = new Map<string, number>();
const TRANSITION_DEBOUNCE_MS = 2000; // Block duplicate calls within 2 seconds

// Track scoring state for active songs
// Maps songId to scoring data: voteMultiplier (starts at 1.0) and playedSeconds (captured on end)
// Why this is safe: Pure in-memory state, doesn't affect existing playback or voting logic
interface SongScoringState {
  voteMultiplier: number;
  playedSeconds?: number;
  startedAt?: Date; // Server timestamp when song started playing
}
const songScoringState = new Map<string, SongScoringState>();

app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// YouTube API proxy endpoint
app.get("/api/youtube/search", async (req, res) => {
  const query = req.query.q as string;

  if (!query) {
    return res.status(400).json({ error: "Query parameter required" });
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=10&q=${encodeURIComponent(query)}&key=${env.YOUTUBE_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.statusText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("YouTube API error:", error);
    res.status(500).json({ error: error.message });
  }
});

// YouTube video details endpoint (for fetching duration)
app.get("/api/youtube/video/:videoId", async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    return res.status(400).json({ error: "Video ID required" });
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoId}&key=${env.YOUTUBE_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return res.status(404).json({ error: "Video not found" });
    }

    // Parse ISO 8601 duration (e.g., "PT4M13S" = 4 minutes 13 seconds = 253 seconds)
    const duration = data.items[0].contentDetails.duration;
    const durationInSeconds = parseISO8601Duration(duration);

    res.json({ duration: durationInSeconds });
  } catch (error: any) {
    console.error("YouTube API error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to parse ISO 8601 duration to seconds
function parseISO8601Duration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const seconds = parseInt(match[3] || "0");

  return hours * 3600 + minutes * 60 + seconds;
}

// Map of socketId to participantId for presence tracking
const socketToParticipant = new Map<string, string>();

// Periodic sync broadcaster - keeps all clients in sync
setInterval(async () => {
  try {
    const activeParties = await prisma.party.findMany({
      where: { status: "active" },
      include: {
        songs: {
          where: { status: "playing" },
        },
      },
    });

    for (const party of activeParties) {
      if (party.currentSongId && party.songs.length > 0) {
        const currentSong = party.songs[0];
        if (currentSong.playedAt) {
          const elapsedSeconds = Math.floor(
            (Date.now() - currentSong.playedAt.getTime()) / 1000
          );

          // Verify room has sockets before emitting
          const roomSockets = await io.in(party.code).fetchSockets();
          console.log(`🔍 [SYNC EMIT] Room "${party.code}" has ${roomSockets.length} sockets: ${roomSockets.map(s => s.id).join(', ')}`);

          io.to(party.code).emit("playback:sync", {
            songId: currentSong.id,
            currentTime: elapsedSeconds,
            serverTimestamp: Date.now(),
          });
        }
      }
    }
  } catch (error) {
    console.error("Error in sync broadcaster:", error);
  }
}, 10000); // Sync every 10 seconds

// Socket.IO connection handling
io.on("connection", (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
  console.log("Client connected:", socket.id);

  /**
   * CREATE PARTY
   */
  socket.on("party:create", async (payload: CreatePartyPayload, callback) => {
    try {
      const code = await generatePartyCode();

      // Create party
      const party = await prisma.party.create({
        data: {
          code,
          duration: payload.config.duration,
          songLimit: payload.config.songLimit,
          voteVisibility: payload.config.voteVisibility,
          theme: payload.config.theme,
          birthdayUserId: payload.config.birthdayUserId,
          status: "lobby",
        },
      });

      // Create host participant
      const host = await prisma.participant.create({
        data: {
          partyId: party.id,
          name: payload.hostName,
          isHost: true,
          socketId: socket.id,
        },
      });

      socketToParticipant.set(socket.id, host.id);
      socket.join(code);

      // Verify room join
      console.log(`🔍 [ROOM JOIN] Socket ${socket.id} joined room "${code}" (party:create)`);
      console.log(`🔍 [ROOM JOIN] Socket rooms:`, Array.from(socket.rooms));

      callback({
        success: true,
        party: {
          ...party,
          participants: [host],
          songs: [],
        },
      });

      console.log(`Party created: ${code} by ${payload.hostName}`);
    } catch (error: any) {
      console.error("Error creating party:", error);
      callback({ success: false, error: error.message });
    }
  });

  /**
   * RECREATE PARTY (Play Again with same participants)
   */
  socket.on("party:recreate", async (payload: RecreatePartyPayload, callback) => {
    try {
      // Fetch previous party with participants
      const previousParty = await prisma.party.findUnique({
        where: { code: payload.previousPartyCode.toUpperCase() },
        include: {
          participants: {
            orderBy: { joinedAt: "asc" },
          },
        },
      });

      if (!previousParty) {
        return callback({ success: false, error: "Previous party not found" });
      }

      // Verify requestor is the host of previous party
      const participantId = socketToParticipant.get(socket.id);
      const requestor = previousParty.participants.find((p) => p.id === participantId);

      if (!requestor || !requestor.isHost) {
        return callback({ success: false, error: "Only the host can recreate the party" });
      }

      // Generate new party code
      const newCode = await generatePartyCode();

      // Use provided config or copy from previous party
      const config = payload.config || {
        duration: previousParty.duration,
        songLimit: previousParty.songLimit,
        voteVisibility: previousParty.voteVisibility,
        theme: previousParty.theme,
        birthdayUserId: previousParty.birthdayUserId,
      };

      // Create new party
      const newParty = await prisma.party.create({
        data: {
          code: newCode,
          duration: config.duration,
          songLimit: config.songLimit,
          voteVisibility: config.voteVisibility,
          theme: config.theme,
          birthdayUserId: config.birthdayUserId,
          status: "lobby",
        },
      });

      // Create new participant records for all previous participants
      const newParticipants = await Promise.all(
        previousParty.participants.map(async (oldParticipant) => {
          return prisma.participant.create({
            data: {
              partyId: newParty.id,
              name: oldParticipant.name,
              isHost: oldParticipant.isHost,
              socketId: oldParticipant.socketId, // Preserve socket association
            },
          });
        })
      );

      // Update socket-to-participant mapping for all participants
      newParticipants.forEach((newParticipant) => {
        if (newParticipant.socketId) {
          socketToParticipant.set(newParticipant.socketId, newParticipant.id);
        }
      });

      // Have all connected participants join the new party room
      const roomSockets = await io.in(previousParty.code).fetchSockets();
      roomSockets.forEach((s) => {
        s.leave(previousParty.code);
        s.join(newCode);
      });

      console.log(`🔍 [PARTY RECREATE] ${roomSockets.length} participants moved from ${previousParty.code} to ${newCode}`);

      // Notify all participants about the new party
      io.to(newCode).emit("party:recreated", {
        ...newParty,
        participants: newParticipants,
        songs: [],
      });

      callback({
        success: true,
        party: {
          ...newParty,
          participants: newParticipants,
          songs: [],
        },
      });

      console.log(`Party recreated: ${newCode} (from ${previousParty.code}) by ${requestor.name}`);
    } catch (error: any) {
      console.error("Error recreating party:", error);
      callback({ success: false, error: error.message });
    }
  });

  /**
   * JOIN PARTY
   */
  socket.on("party:join", async (payload: JoinPartyPayload, callback) => {
    try {
      const party = await prisma.party.findUnique({
        where: { code: payload.code.toUpperCase() },
        include: {
          participants: { orderBy: { joinedAt: "asc" } },
          songs: {
            orderBy: { orderIndex: "asc" },
            include: {
              addedBy: true,
              votes: true,
            },
          },
        },
      });

      if (!party) {
        return callback({ success: false, error: "Party not found" });
      }

      if (party.status === "ended") {
        return callback({ success: false, error: "Party has ended" });
      }

      // Create participant
      const participant = await prisma.participant.create({
        data: {
          partyId: party.id,
          name: payload.name,
          isHost: false,
          socketId: socket.id,
        },
      });

      socketToParticipant.set(socket.id, participant.id);
      socket.join(payload.code.toUpperCase());

      // Verify room join
      console.log(`🔍 [ROOM JOIN] Socket ${socket.id} joined room "${payload.code.toUpperCase()}" (party:join)`);
      console.log(`🔍 [ROOM JOIN] Socket rooms:`, Array.from(socket.rooms));

      // Notify others
      socket.to(party.code).emit("participant:joined", participant);

      // Send full state to the joining user
      callback({
        success: true,
        party: {
          ...party,
          participants: [...party.participants, participant],
        },
      });

      console.log(`${payload.name} joined party ${party.code}`);
    } catch (error: any) {
      console.error("Error joining party:", error);
      callback({ success: false, error: error.message });
    }
  });

  /**
   * LEAVE PARTY
   */
  socket.on("party:leave", async (partyCode: string) => {
    try {
      const participantId = socketToParticipant.get(socket.id);
      if (!participantId) return;

      const participant = await prisma.participant.findUnique({
        where: { id: participantId },
        include: { party: true },
      });

      if (!participant) return;

      // If host is leaving, end the party for everyone
      if (participant.isHost) {
        await prisma.party.update({
          where: { id: participant.party.id },
          data: {
            status: "ended",
            endedAt: new Date(),
          },
        });

        // Notify all participants that party ended because host left
        io.to(partyCode).emit("party:hostLeft");

        console.log(`Host left party ${partyCode} - party ended`);
      } else {
        // Regular participant leaving
        await prisma.participant.update({
          where: { id: participantId },
          data: { socketId: null, lastSeen: new Date() },
        });

        socket.to(partyCode).emit("participant:left", participantId);
        console.log(`Participant ${participantId} left party ${partyCode}`);
      }

      socket.leave(partyCode);
      socketToParticipant.delete(socket.id);
    } catch (error) {
      console.error("Error leaving party:", error);
    }
  });

  /**
   * START PARTY (host only)
   */
  socket.on("party:start", async (payload: StartPartyPayload) => {
    try {
      const party = await prisma.party.findUnique({
        where: { code: payload.partyCode },
        include: {
          participants: true,
          songs: {
            where: { status: "queued" },
            orderBy: { orderIndex: "asc" },
          },
        },
      });

      if (!party) {
        socket.emit("error", "Party not found");
        return;
      }

      // Verify host
      const participantId = socketToParticipant.get(socket.id);
      const participant = party.participants.find((p) => p.id === participantId);

      if (!participant || !participant.isHost) {
        socket.emit("error", "Only the host can start the party");
        return;
      }

      if (party.songs.length === 0) {
        socket.emit("error", "Add at least one song to start");
        return;
      }

      // If birthday theme and birthday user is set, prioritize their first song
      if (party.birthdayUserId) {
        const birthdaySongIndex = party.songs.findIndex(
          (s) => s.addedById === party.birthdayUserId
        );

        if (birthdaySongIndex > 0) {
          // Move birthday user's first song to the top
          const birthdaySong = party.songs[birthdaySongIndex];

          // Update order indices
          await prisma.song.update({
            where: { id: birthdaySong.id },
            data: { orderIndex: -1 }, // Temporarily set to -1
          });

          // Shift all songs before it up by 1
          for (let i = 0; i < birthdaySongIndex; i++) {
            await prisma.song.update({
              where: { id: party.songs[i].id },
              data: { orderIndex: i + 1 },
            });
          }

          // Set birthday song to index 0
          await prisma.song.update({
            where: { id: birthdaySong.id },
            data: { orderIndex: 0 },
          });

          console.log(`Birthday song moved to front for party ${party.code}`);
        }
      }

      // Refetch songs with updated order
      const updatedParty = await prisma.party.findUnique({
        where: { id: party.id },
        include: {
          songs: {
            where: { status: "queued" },
            orderBy: { orderIndex: "asc" },
          },
        },
      });

      if (!updatedParty || updatedParty.songs.length === 0) {
        socket.emit("error", "Failed to start party");
        return;
      }

      // Update party status
      await prisma.party.update({
        where: { id: party.id },
        data: {
          status: "active",
          startedAt: new Date(),
        },
      });

      // Start first song (which is now the birthday song if applicable)
      const firstSong = updatedParty.songs[0];
      const now = new Date();
      await prisma.song.update({
        where: { id: firstSong.id },
        data: {
          status: "playing",
          playedAt: now,
        },
      });

      // Initialize scoring state for this song
      // Safe: Just tracking state, doesn't affect playback
      songScoringState.set(firstSong.id, {
        voteMultiplier: 1.0,
        startedAt: now,
      });
      console.log(`🎯 Initialized scoring for song ${firstSong.id}: voteMultiplier=1.0`);

      await prisma.party.update({
        where: { id: party.id },
        data: { currentSongId: firstSong.id },
      });

      io.to(party.code).emit("party:started", {
        ...party,
        status: "active",
        startedAt: new Date(),
        currentSongId: firstSong.id,
      });

      io.to(party.code).emit("song:playing", {
        ...firstSong,
        status: "playing",
        serverTimestamp: now.getTime(),
        startPosition: 0,
      });

      console.log(`Party ${party.code} started`);
    } catch (error) {
      console.error("Error starting party:", error);
      socket.emit("error", "Failed to start party");
    }
  });

  /**
   * ADD SONG
   */
  socket.on("song:add", async (payload: AddSongPayload, callback) => {
    try {
      const party = await prisma.party.findUnique({
        where: { code: payload.partyCode },
        include: {
          songs: true,
        },
      });

      if (!party) {
        return callback({ success: false, error: "Party not found" });
      }

      if (party.status === "ended") {
        return callback({ success: false, error: "Party has ended" });
      }

      const participantId = socketToParticipant.get(socket.id);
      if (!participantId) {
        return callback({ success: false, error: "Not in party" });
      }

      // Check song limit
      if (party.songLimit && party.songs.length >= party.songLimit) {
        return callback({ success: false, error: "Song limit reached" });
      }

      // Get next order index
      const maxOrderIndex = party.songs.reduce(
        (max, song) => Math.max(max, song.orderIndex),
        -1
      );

      const song = await prisma.song.create({
        data: {
          partyId: party.id,
          addedById: participantId,
          youtubeId: payload.song.youtubeId,
          title: payload.song.title,
          artist: payload.song.artist,
          thumbnail: payload.song.thumbnail,
          duration: payload.song.duration,
          status: "queued",
          orderIndex: maxOrderIndex + 1,
        },
        include: {
          addedBy: true,
          votes: true,
        },
      });

      io.to(party.code).emit("song:added", song);

      callback({ success: true, song });

      console.log(`Song added to party ${party.code}: ${song.title}`);
    } catch (error: any) {
      console.error("Error adding song:", error);
      callback({ success: false, error: error.message });
    }
  });

  /**
   * VOTE ON SONG
   */
  socket.on("song:vote", async (payload: VoteSongPayload) => {
    try {
      const participantId = socketToParticipant.get(socket.id);
      if (!participantId) {
        socket.emit("error", "Not in party");
        return;
      }

      const song = await prisma.song.findUnique({
        where: { id: payload.songId },
        include: { party: true },
      });

      if (!song) {
        socket.emit("error", "Song not found");
        return;
      }

      if (song.party.status === "lobby") {
        socket.emit("error", "Voting opens when party starts");
        return;
      }

      // Validate score (1-5)
      if (payload.score < 1 || payload.score > 5) {
        socket.emit("error", "Invalid score");
        return;
      }

      // Upsert vote (update if exists, create if not)
      await prisma.vote.upsert({
        where: {
          songId_participantId: {
            songId: payload.songId,
            participantId,
          },
        },
        update: {
          score: payload.score,
        },
        create: {
          songId: payload.songId,
          participantId,
          score: payload.score,
        },
      });

      // Update vote multiplier in scoring state
      // Safe: Only updates in-memory state, doesn't affect existing voting/playback logic
      const scoringState = songScoringState.get(payload.songId);
      if (scoringState) {
        const oldMultiplier = scoringState.voteMultiplier;
        const newMultiplier = updateVoteMultiplier(oldMultiplier, payload.score);
        scoringState.voteMultiplier = newMultiplier;

        console.log(`🎯 Vote multiplier updated for song ${payload.songId}:`);
        console.log(`   Vote score: ${payload.score}, Old: ${oldMultiplier.toFixed(4)}, New: ${newMultiplier.toFixed(4)}`);
      }

      // Get all votes for this song
      const votes = await prisma.vote.findMany({
        where: { songId: payload.songId },
        include: { participant: true },
      });

      // If vote visibility is live, broadcast update
      if (song.party.voteVisibility === "live") {
        io.to(song.party.code).emit("vote:updated", {
          songId: payload.songId,
          votes,
        });
      }

      // Check vote thresholds for real-time playback control (only for currently playing song)
      console.log(`🔍 Vote received - Checking thresholds:`);
      console.log(`   Song status: ${song.status}, Party currentSongId: ${song.party.currentSongId}, This song ID: ${song.id}`);
      console.log(`   Condition met: ${song.status === "playing" && song.id === song.party.currentSongId}`);

      if (song.status === "playing" && song.id === song.party.currentSongId) {
        const participantCount = await prisma.participant.count({
          where: { partyId: song.party.id },
        });

        // Count votes by score
        const cutVotes = votes.filter(v => v.score === 1).length;
        const mehVotes = votes.filter(v => v.score === 2).length;

        console.log(`   📊 Vote counts: Cut=${cutVotes}, Meh=${mehVotes}, Total Participants=${participantCount}`);
        console.log(`   Cut threshold: ${cutVotes} > ${participantCount / 2} = ${cutVotes > participantCount / 2}`);
        console.log(`   Meh threshold: ${mehVotes} >= ${participantCount / 2} = ${mehVotes >= participantCount / 2}`);

        // Threshold 1: More than half voted "Cut" → Skip song entirely
        if (cutVotes > participantCount / 2) {
          console.log(`🚨 Vote threshold met: ${cutVotes}/${participantCount} voted Cut - Skipping song`);
          console.log(`   Song: ${song.title} (${song.id})`);
          console.log(`   Party: ${song.party.code}`);

          // Capture how long the song played before being cut
          // Safe: Just recording data for scoring, doesn't affect playback
          const scoringState = songScoringState.get(song.id);
          let finalScoreValue: number | undefined;
          let voteMultiplierValue: number | undefined;

          if (scoringState && scoringState.startedAt) {
            const endTime = new Date();
            const elapsedMs = endTime.getTime() - scoringState.startedAt.getTime();
            const playedSeconds = elapsedMs / 1000;
            scoringState.playedSeconds = playedSeconds;

            // Calculate final score using our scoring functions
            const timeScore = computeTimeScore(playedSeconds, song.duration);
            finalScoreValue = computeFinalScore(timeScore, scoringState.voteMultiplier);
            voteMultiplierValue = scoringState.voteMultiplier;

            console.log(`🎯 Scoring for song ${song.id} (cut by votes):`);
            console.log(`   Played: ${playedSeconds.toFixed(2)}s / ${song.duration}s`);
            console.log(`   TimeScore: ${timeScore.toFixed(2)}%`);
            console.log(`   VoteMultiplier: ${scoringState.voteMultiplier.toFixed(4)}`);
            console.log(`   FinalScore: ${finalScoreValue.toFixed(2)}`);
          }

          // Mark song as played and save scoring data
          await prisma.song.update({
            where: { id: song.id },
            data: {
              status: "played",
              playedAt: new Date(),
              voteMultiplier: voteMultiplierValue,
              finalScore: finalScoreValue,
            },
          });

          const skipData = {
            songId: song.id,
            reason: "More than half the party voted to cut this song",
          };

          // Verify room has sockets before emitting
          const roomSockets = await io.in(song.party.code).fetchSockets();
          console.log(`🔍 [SKIP EMIT] Room "${song.party.code}" has ${roomSockets.length} sockets: ${roomSockets.map(s => s.id).join(', ')}`);

          // Emit skip event to all clients (they will handle song:next)
          console.log(`📡 Emitting playback:skip to room "${song.party.code}":`, skipData);
          io.to(song.party.code).emit("playback:skip", skipData);
          console.log(`✅ playback:skip emitted`);
        }
        // Threshold 2: Half or more voted "Meh" → Seek to middle, last 30s, or last 15s (whichever is closest forward)
        else if (mehVotes >= participantCount / 2) {
          const songDuration = song.duration; // in seconds

          // Calculate current playback position
          const currentTime = song.playedAt
            ? Math.floor((Date.now() - song.playedAt.getTime()) / 1000)
            : 0;

          // Calculate potential seek targets
          const middle = Math.floor(songDuration / 2);
          const last30 = Math.max(0, songDuration - 30);
          const last15 = Math.max(0, songDuration - 15);

          // Get all potential targets
          const targets = [middle, last30, last15];

          // Filter targets that are ahead of current position (only skip forward)
          const forwardTargets = targets.filter(t => t > currentTime);

          if (forwardTargets.length > 0) {
            // Pick the closest forward target
            const seekTo = Math.min(...forwardTargets);

            console.log(`⏩ Vote threshold met: ${mehVotes}/${participantCount} voted Meh - Seeking to ${seekTo}s`);
            console.log(`   Current time: ${currentTime}s, Song duration: ${songDuration}s`);
            console.log(`   Targets: Middle: ${middle}s, Last30: ${last30}s, Last15: ${last15}s`);
            console.log(`   Forward targets: ${forwardTargets.join(', ')}s`);
            console.log(`   Party: ${song.party.code}`);

            const seekData: PlaybackSeekData = {
              songId: song.id,
              seekTo,
              reason: "meh",
            };

            // Verify room has sockets before emitting
            const roomSockets = await io.in(song.party.code).fetchSockets();
            console.log(`🔍 [SEEK EMIT] Room "${song.party.code}" has ${roomSockets.length} sockets: ${roomSockets.map(s => s.id).join(', ')}`);

            // Emit seek event to all clients
            console.log(`📡 Emitting playback:seek to room "${song.party.code}":`, seekData);
            io.to(song.party.code).emit("playback:seek", seekData);
            console.log(`✅ playback:seek emitted`);
          } else {
            console.log(`⏩ Vote threshold met: ${mehVotes}/${participantCount} voted Meh - But already past all targets`);
            console.log(`   Current time: ${currentTime}s, Targets: ${targets.join(', ')}s - No action taken`);
          }
        }
      }

      console.log(`Vote recorded: Song ${payload.songId}, Score ${payload.score}`);
    } catch (error) {
      console.error("Error voting:", error);
      socket.emit("error", "Failed to record vote");
    }
  });

  /**
   * NEXT SONG (auto-advance or manual)
   */
  socket.on("song:next", async (partyCode: string) => {
    try {
      const party = await prisma.party.findUnique({
        where: { code: partyCode },
        include: {
          songs: {
            orderBy: { orderIndex: "asc" },
          },
        },
      });

      if (!party || party.status !== "active") return;

      // Idempotency check: prevent race conditions from duplicate song:next calls
      const transitionTime = Date.now();
      const lastTransition = songTransitionsInProgress.get(partyCode);

      if (lastTransition && (transitionTime - lastTransition) < TRANSITION_DEBOUNCE_MS) {
        console.log(`⚠️ [BLOCKED] Duplicate song:next call for party ${partyCode}`);
        console.log(`   Last transition: ${lastTransition}, Current: ${transitionTime}, Diff: ${transitionTime - lastTransition}ms`);
        return; // Ignore duplicate call
      }

      // Mark this transition as in progress
      songTransitionsInProgress.set(partyCode, transitionTime);
      console.log(`🔄 [TRANSITION START] Party ${partyCode} at ${new Date(transitionTime).toISOString()}`);

      // Mark current song as played and compute final score
      if (party.currentSongId) {
        // Fetch the song to get duration for scoring
        const currentSong = await prisma.song.findUnique({
          where: { id: party.currentSongId },
        });

        // Calculate final score
        let finalScoreValue: number | undefined;
        let voteMultiplierValue: number | undefined;

        const scoringState = songScoringState.get(party.currentSongId);
        if (currentSong && scoringState && scoringState.startedAt) {
          const endTime = new Date();
          const elapsedMs = endTime.getTime() - scoringState.startedAt.getTime();
          const playedSeconds = elapsedMs / 1000;
          scoringState.playedSeconds = playedSeconds;

          // Calculate final score using our scoring functions
          const timeScore = computeTimeScore(playedSeconds, currentSong.duration);
          finalScoreValue = computeFinalScore(timeScore, scoringState.voteMultiplier);
          voteMultiplierValue = scoringState.voteMultiplier;

          console.log(`🎯 Scoring for song ${party.currentSongId}:`);
          console.log(`   Played: ${playedSeconds.toFixed(2)}s / ${currentSong.duration}s`);
          console.log(`   TimeScore: ${timeScore.toFixed(2)}%`);
          console.log(`   VoteMultiplier: ${scoringState.voteMultiplier.toFixed(4)}`);
          console.log(`   FinalScore: ${finalScoreValue.toFixed(2)}`);
        }

        // Update song status and save scoring data
        await prisma.song.update({
          where: { id: party.currentSongId },
          data: {
            status: "played",
            playedAt: new Date(),
            voteMultiplier: voteMultiplierValue,
            finalScore: finalScoreValue,
          },
        });

        io.to(party.code).emit("song:ended", party.currentSongId);
      }

      // Check if party should auto-end
      const shouldEnd = await checkPartyAutoEnd(party.id);

      if (shouldEnd) {
        await endParty(party.id, party.code);
        return;
      }

      // Get next queued song
      const nextSong = await getNextQueuedSong(party.id);

      if (!nextSong) {
        // No more songs, end party
        await endParty(party.id, party.code);
        return;
      }

      // Start next song
      const now = new Date();
      await prisma.song.update({
        where: { id: nextSong.id },
        data: {
          status: "playing",
          playedAt: now,
        },
      });

      // Initialize scoring state for this song
      // Safe: Just tracking state, doesn't affect playback
      songScoringState.set(nextSong.id, {
        voteMultiplier: 1.0,
        startedAt: now,
      });
      console.log(`🎯 Initialized scoring for song ${nextSong.id}: voteMultiplier=1.0`);

      await prisma.party.update({
        where: { id: party.id },
        data: { currentSongId: nextSong.id },
      });

      io.to(party.code).emit("song:playing", {
        ...nextSong,
        status: "playing",
        serverTimestamp: now.getTime(),
        startPosition: 0,
      });

      console.log(`✅ [TRANSITION COMPLETE] Party ${party.code}: ${nextSong.title}`);
      const transitionDuration = Date.now() - songTransitionsInProgress.get(party.code)!;
      console.log(`   Transition took: ${transitionDuration}ms`);
    } catch (error) {
      console.error("❌ [TRANSITION ERROR] Error advancing to next song:", error);
      // Clear the transition flag on error so party doesn't get stuck
      songTransitionsInProgress.delete(partyCode);
    }
  });

  /**
   * END PARTY (host only or auto)
   */
  socket.on("party:end", async (payload: EndPartyPayload) => {
    try {
      const party = await prisma.party.findUnique({
        where: { code: payload.partyCode },
        include: { participants: true },
      });

      if (!party) {
        socket.emit("error", "Party not found");
        return;
      }

      // Verify host
      const participantId = socketToParticipant.get(socket.id);
      const participant = party.participants.find((p) => p.id === participantId);

      if (!participant || !participant.isHost) {
        socket.emit("error", "Only the host can end the party");
        return;
      }

      await endParty(party.id, party.code);
    } catch (error) {
      console.error("Error ending party:", error);
      socket.emit("error", "Failed to end party");
    }
  });

  /**
   * SKIP SONG (host only)
   */
  socket.on("song:skip", async (payload: SkipSongPayload) => {
    try {
      const party = await prisma.party.findUnique({
        where: { code: payload.partyCode },
        include: { participants: true },
      });

      if (!party) {
        socket.emit("error", "Party not found");
        return;
      }

      // Verify host
      const participantId = socketToParticipant.get(socket.id);
      const participant = party.participants.find((p) => p.id === participantId);

      if (!participant || !participant.isHost) {
        socket.emit("error", "Only the host can skip songs");
        return;
      }

      if (party.status !== "active") {
        socket.emit("error", "Party is not active");
        return;
      }

      // Mark current song as played and compute final score
      if (party.currentSongId) {
        // Fetch the song to get duration for scoring
        const currentSong = await prisma.song.findUnique({
          where: { id: party.currentSongId },
        });

        // Calculate final score
        let finalScoreValue: number | undefined;
        let voteMultiplierValue: number | undefined;

        const scoringState = songScoringState.get(party.currentSongId);
        if (currentSong && scoringState && scoringState.startedAt) {
          const endTime = new Date();
          const elapsedMs = endTime.getTime() - scoringState.startedAt.getTime();
          const playedSeconds = elapsedMs / 1000;
          scoringState.playedSeconds = playedSeconds;

          // Calculate final score using our scoring functions
          const timeScore = computeTimeScore(playedSeconds, currentSong.duration);
          finalScoreValue = computeFinalScore(timeScore, scoringState.voteMultiplier);
          voteMultiplierValue = scoringState.voteMultiplier;

          console.log(`🎯 Scoring for song ${party.currentSongId} (skipped by host):`);
          console.log(`   Played: ${playedSeconds.toFixed(2)}s / ${currentSong.duration}s`);
          console.log(`   TimeScore: ${timeScore.toFixed(2)}%`);
          console.log(`   VoteMultiplier: ${scoringState.voteMultiplier.toFixed(4)}`);
          console.log(`   FinalScore: ${finalScoreValue.toFixed(2)}`);
        }

        // Update song status and save scoring data
        await prisma.song.update({
          where: { id: party.currentSongId },
          data: {
            status: "played",
            playedAt: new Date(),
            voteMultiplier: voteMultiplierValue,
            finalScore: finalScoreValue,
          },
        });

        io.to(party.code).emit("song:ended", party.currentSongId);
      }

      // Check if party should auto-end
      const shouldEnd = await checkPartyAutoEnd(party.id);

      if (shouldEnd) {
        await endParty(party.id, party.code);
        return;
      }

      // Get next queued song
      const nextSong = await getNextQueuedSong(party.id);

      if (!nextSong) {
        // No more songs, end party
        await endParty(party.id, party.code);
        return;
      }

      // Start next song
      const now = new Date();
      await prisma.song.update({
        where: { id: nextSong.id },
        data: {
          status: "playing",
          playedAt: now,
        },
      });

      // Initialize scoring state for this song
      // Safe: Just tracking state, doesn't affect playback
      songScoringState.set(nextSong.id, {
        voteMultiplier: 1.0,
        startedAt: now,
      });
      console.log(`🎯 Initialized scoring for song ${nextSong.id}: voteMultiplier=1.0`);

      await prisma.party.update({
        where: { id: party.id },
        data: { currentSongId: nextSong.id },
      });

      io.to(party.code).emit("song:playing", {
        ...nextSong,
        status: "playing",
        serverTimestamp: now.getTime(),
        startPosition: 0,
      });

      console.log(`Host skipped song in party ${payload.partyCode}`);
    } catch (error) {
      console.error("Error skipping song:", error);
      socket.emit("error", "Failed to skip song");
    }
  });

  /**
   * KICK PARTICIPANT (host only)
   */
  socket.on("participant:kick", async (payload: KickParticipantPayload) => {
    try {
      const party = await prisma.party.findUnique({
        where: { code: payload.partyCode },
        include: { participants: true },
      });

      if (!party) {
        socket.emit("error", "Party not found");
        return;
      }

      // Verify host
      const participantId = socketToParticipant.get(socket.id);
      const participant = party.participants.find((p) => p.id === participantId);

      if (!participant || !participant.isHost) {
        socket.emit("error", "Only the host can kick participants");
        return;
      }

      // Can't kick yourself
      if (payload.participantId === participantId) {
        socket.emit("error", "You cannot kick yourself");
        return;
      }

      // Find the participant to kick
      const targetParticipant = party.participants.find(
        (p) => p.id === payload.participantId
      );

      if (!targetParticipant) {
        socket.emit("error", "Participant not found");
        return;
      }

      // Remove from database
      await prisma.participant.delete({
        where: { id: payload.participantId },
      });

      // Remove from socket map
      if (targetParticipant.socketId) {
        socketToParticipant.delete(targetParticipant.socketId);

        // Disconnect their socket
        const targetSocket = io.sockets.sockets.get(targetParticipant.socketId);
        if (targetSocket) {
          targetSocket.emit("participant:kicked", payload.participantId);
          targetSocket.disconnect(true);
        }
      }

      // Notify everyone else
      socket.to(party.code).emit("participant:left", payload.participantId);

      console.log(
        `Participant ${targetParticipant.name} kicked from party ${payload.partyCode}`
      );
    } catch (error) {
      console.error("Error kicking participant:", error);
      socket.emit("error", "Failed to kick participant");
    }
  });

  /**
   * SET BIRTHDAY USER
   */
  socket.on("party:setBirthdayUser", async (payload: { partyCode: string; userId: string | null }) => {
    try {
      const party = await prisma.party.findUnique({
        where: { code: payload.partyCode },
        include: { participants: true },
      });

      if (!party) {
        socket.emit("error", "Party not found");
        return;
      }

      // Verify host
      const participantId = socketToParticipant.get(socket.id);
      const participant = party.participants.find((p) => p.id === participantId);

      if (!participant || !participant.isHost) {
        socket.emit("error", "Only the host can set the birthday person");
        return;
      }

      // Update party with birthday user
      const updatedParty = await prisma.party.update({
        where: { id: party.id },
        data: { birthdayUserId: payload.userId },
        include: {
          participants: true,
          songs: {
            include: {
              addedBy: true,
              votes: { include: { participant: true } },
            },
            orderBy: { orderIndex: "asc" },
          },
        },
      });

      // Broadcast updated party to all participants
      io.to(party.code).emit("party:updated", updatedParty);

      console.log(
        `Birthday user ${payload.userId ? "set" : "removed"} for party ${payload.partyCode}`
      );
    } catch (error) {
      console.error("Error setting birthday user:", error);
      socket.emit("error", "Failed to set birthday user");
    }
  });

  /**
   * PRESENCE HEARTBEAT
   */
  socket.on("presence:heartbeat", async () => {
    try {
      const participantId = socketToParticipant.get(socket.id);
      if (!participantId) return;

      await prisma.participant.update({
        where: { id: participantId },
        data: { lastSeen: new Date() },
      });
    } catch (error) {
      console.error("Error updating presence:", error);
    }
  });

  /**
   * DISCONNECT
   */
  socket.on("disconnect", async () => {
    try {
      const participantId = socketToParticipant.get(socket.id);
      if (!participantId) return;

      const participant = await prisma.participant.findUnique({
        where: { id: participantId },
        include: { party: true },
      });

      if (participant) {
        // If host disconnects, end the party for everyone
        if (participant.isHost && participant.party.status !== "ended") {
          await prisma.party.update({
            where: { id: participant.party.id },
            data: {
              status: "ended",
              endedAt: new Date(),
            },
          });

          // Notify all participants that party ended because host disconnected
          io.to(participant.party.code).emit("party:hostLeft");

          console.log(`Host disconnected from party ${participant.party.code} - party ended`);
        } else {
          // Regular participant disconnect
          await prisma.participant.update({
            where: { id: participantId },
            data: { socketId: null, lastSeen: new Date() },
          });

          socket.to(participant.party.code).emit("participant:left", participantId);
        }
      }

      socketToParticipant.delete(socket.id);
      console.log("Client disconnected:", socket.id);
    } catch (error) {
      console.error("Error handling disconnect:", error);
    }
  });
});

/**
 * Helper function to end party
 */
async function endParty(partyId: string, partyCode: string) {
  await prisma.party.update({
    where: { id: partyId },
    data: {
      status: "ended",
      endedAt: new Date(),
    },
  });

  // Calculate winner
  const result = await calculatePartyResult(partyId);

  io.to(partyCode).emit("party:ended", result);

  console.log(`Party ${partyCode} ended. Winner: ${result.winner?.title || "None"}`);
}

server.listen(env.PORT, () => {
  console.log(`🎵 Nero Party Server running on http://localhost:${env.PORT}`);
});

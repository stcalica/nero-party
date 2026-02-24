import { PrismaClient } from "@prisma/client";
import type { SongWithStats, PartyResult } from "./types.js";

const prisma = new PrismaClient();

/**
 * Generate a unique 6-character party code
 */
export async function generatePartyCode(): Promise<string> {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Remove ambiguous chars
  let code: string;
  let isUnique = false;

  do {
    code = "";
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    // Check if code already exists
    const existing = await prisma.party.findUnique({
      where: { code },
    });

    isUnique = !existing;
  } while (!isUnique);

  return code;
}

/**
 * Calculate winner and all song statistics
 * Winner: Highest average score, minimum 2 votes required
 * Tiebreaker: Most total votes
 */
export async function calculatePartyResult(partyId: string): Promise<PartyResult> {
  const songs = await prisma.song.findMany({
    where: { partyId },
    include: {
      votes: true,
      addedBy: true,
    },
  });

  const songStats: SongWithStats[] = songs
    .map((song) => {
      const votes = song.votes;
      const totalVotes = votes.length;

      // Calculate average score (legacy fallback)
      const averageScore =
        totalVotes > 0
          ? votes.reduce((sum, vote) => sum + vote.score, 0) / totalVotes
          : 0;

      // Vote breakdown
      const voteBreakdown = {
        score1: votes.filter((v) => v.score === 1).length,
        score2: votes.filter((v) => v.score === 2).length,
        score3: votes.filter((v) => v.score === 3).length,
        score4: votes.filter((v) => v.score === 4).length,
        score5: votes.filter((v) => v.score === 5).length,
      };

      return {
        songId: song.id,
        title: song.title,
        artist: song.artist,
        thumbnail: song.thumbnail,
        youtubeId: song.youtubeId,
        addedByName: song.addedBy.name,
        averageScore,
        totalVotes,
        voteBreakdown,
        // Include new scoring fields if available
        finalScore: song.finalScore ?? undefined,
        voteMultiplier: song.voteMultiplier ?? undefined,
      };
    })
    .filter((song) => song.totalVotes >= 2) // Minimum 2 votes to be eligible
    .sort((a, b) => {
      // Prefer finalScore if both songs have it
      if (a.finalScore !== undefined && b.finalScore !== undefined) {
        if (b.finalScore !== a.finalScore) {
          return b.finalScore - a.finalScore;
        }
        // Tiebreaker: most votes
        return b.totalVotes - a.totalVotes;
      }

      // Fallback: use average score if finalScore not available
      if (b.averageScore !== a.averageScore) {
        return b.averageScore - a.averageScore;
      }
      // Tiebreaker: most votes
      return b.totalVotes - a.totalVotes;
    });

  // Get all songs sorted (for final standings)
  const allSongsSorted = songs
    .map((song) => {
      const votes = song.votes;
      const totalVotes = votes.length;
      const averageScore =
        totalVotes > 0
          ? votes.reduce((sum, vote) => sum + vote.score, 0) / totalVotes
          : 0;

      return {
        songId: song.id,
        title: song.title,
        artist: song.artist,
        thumbnail: song.thumbnail,
        youtubeId: song.youtubeId,
        addedByName: song.addedBy.name,
        averageScore,
        totalVotes,
        voteBreakdown: {
          score1: votes.filter((v) => v.score === 1).length,
          score2: votes.filter((v) => v.score === 2).length,
          score3: votes.filter((v) => v.score === 3).length,
          score4: votes.filter((v) => v.score === 4).length,
          score5: votes.filter((v) => v.score === 5).length,
        },
        // Include new scoring fields if available
        finalScore: song.finalScore ?? undefined,
        voteMultiplier: song.voteMultiplier ?? undefined,
      };
    })
    .sort((a, b) => {
      // Prefer finalScore if both songs have it
      if (a.finalScore !== undefined && b.finalScore !== undefined) {
        if (b.finalScore !== a.finalScore) {
          return b.finalScore - a.finalScore;
        }
        return b.totalVotes - a.totalVotes;
      }

      // Fallback: use average score if finalScore not available
      if (b.averageScore !== a.averageScore) {
        return b.averageScore - a.averageScore;
      }
      return b.totalVotes - a.totalVotes;
    });

  const winner = songStats[0] || allSongsSorted[0];

  return {
    winner,
    allSongs: allSongsSorted,
  };
}

/**
 * Check if party should auto-end
 */
export async function checkPartyAutoEnd(partyId: string): Promise<boolean> {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    include: {
      songs: { where: { status: "played" } },
    },
  });

  if (!party || party.status !== "active") {
    return false;
  }

  // Check song limit
  if (party.songLimit && party.songs.length >= party.songLimit) {
    return true;
  }

  // Check time limit
  if (party.duration && party.startedAt) {
    const endTime = new Date(party.startedAt.getTime() + party.duration * 60 * 1000);
    if (new Date() >= endTime) {
      return true;
    }
  }

  return false;
}

/**
 * Get the next queued song
 */
export async function getNextQueuedSong(partyId: string) {
  return await prisma.song.findFirst({
    where: {
      partyId,
      status: "queued",
    },
    orderBy: {
      orderIndex: "asc",
    },
  });
}

export { prisma };

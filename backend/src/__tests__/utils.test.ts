import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { PrismaClient } from '@prisma/client';

// Mock Prisma
const mockPrisma = {
  party: {
    findUnique: jest.fn(),
  },
  song: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
} as unknown as PrismaClient;

jest.mock('../utils.js', () => {
  const actual = jest.requireActual('../utils.js') as any;
  return {
    ...actual,
    prisma: mockPrisma,
  };
});

import { calculatePartyResult, checkPartyAutoEnd, getNextQueuedSong } from '../utils.js';

describe('calculatePartyResult', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should calculate winner with highest average score', async () => {
    const mockSongs = [
      {
        id: 'song1',
        title: 'Song 1',
        artist: 'Artist 1',
        thumbnail: 'thumb1.jpg',
        youtubeId: 'yt1',
        addedBy: { name: 'User 1' },
        votes: [
          { score: 5 },
          { score: 5 },
          { score: 4 },
        ],
      },
      {
        id: 'song2',
        title: 'Song 2',
        artist: 'Artist 2',
        thumbnail: 'thumb2.jpg',
        youtubeId: 'yt2',
        addedBy: { name: 'User 2' },
        votes: [
          { score: 3 },
          { score: 3 },
        ],
      },
    ];

    (mockPrisma.song.findMany as jest.Mock).mockResolvedValue(mockSongs);

    const result = await calculatePartyResult('party1');

    expect(result.winner).toBeDefined();
    expect(result.winner.songId).toBe('song1');
    expect(result.winner.averageScore).toBeCloseTo(4.67, 1);
    expect(result.winner.totalVotes).toBe(3);
    expect(result.allSongs).toHaveLength(2);
  });

  it('should filter out songs with less than 2 votes for winner', async () => {
    const mockSongs = [
      {
        id: 'song1',
        title: 'Song 1',
        artist: 'Artist 1',
        thumbnail: 'thumb1.jpg',
        youtubeId: 'yt1',
        addedBy: { name: 'User 1' },
        votes: [{ score: 5 }], // Only 1 vote
      },
      {
        id: 'song2',
        title: 'Song 2',
        artist: 'Artist 2',
        thumbnail: 'thumb2.jpg',
        youtubeId: 'yt2',
        addedBy: { name: 'User 2' },
        votes: [
          { score: 4 },
          { score: 4 },
        ],
      },
    ];

    (mockPrisma.song.findMany as jest.Mock).mockResolvedValue(mockSongs);

    const result = await calculatePartyResult('party1');

    expect(result.winner.songId).toBe('song2');
  });

  it('should use total votes as tiebreaker', async () => {
    const mockSongs = [
      {
        id: 'song1',
        title: 'Song 1',
        artist: 'Artist 1',
        thumbnail: 'thumb1.jpg',
        youtubeId: 'yt1',
        addedBy: { name: 'User 1' },
        votes: [
          { score: 4 },
          { score: 4 },
        ],
      },
      {
        id: 'song2',
        title: 'Song 2',
        artist: 'Artist 2',
        thumbnail: 'thumb2.jpg',
        youtubeId: 'yt2',
        addedBy: { name: 'User 2' },
        votes: [
          { score: 4 },
          { score: 4 },
          { score: 4 },
        ],
      },
    ];

    (mockPrisma.song.findMany as jest.Mock).mockResolvedValue(mockSongs);

    const result = await calculatePartyResult('party1');

    expect(result.winner.songId).toBe('song2');
    expect(result.winner.totalVotes).toBe(3);
  });

  it('should calculate vote breakdown correctly', async () => {
    const mockSongs = [
      {
        id: 'song1',
        title: 'Song 1',
        artist: 'Artist 1',
        thumbnail: 'thumb1.jpg',
        youtubeId: 'yt1',
        addedBy: { name: 'User 1' },
        votes: [
          { score: 1 },
          { score: 2 },
          { score: 3 },
          { score: 4 },
          { score: 5 },
        ],
      },
    ];

    (mockPrisma.song.findMany as jest.Mock).mockResolvedValue(mockSongs);

    const result = await calculatePartyResult('party1');

    expect(result.winner.voteBreakdown).toEqual({
      score1: 1,
      score2: 1,
      score3: 1,
      score4: 1,
      score5: 1,
    });
  });
});

describe('checkPartyAutoEnd', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return true if song limit is reached', async () => {
    const mockParty = {
      id: 'party1',
      status: 'active',
      songLimit: 5,
      songs: [{}, {}, {}, {}, {}], // 5 played songs
      duration: null,
      startedAt: null,
    };

    (mockPrisma.party.findUnique as jest.Mock).mockResolvedValue(mockParty);

    const result = await checkPartyAutoEnd('party1');

    expect(result).toBe(true);
  });

  it('should return true if duration is exceeded', async () => {
    const past = new Date(Date.now() - 31 * 60 * 1000); // 31 minutes ago
    const mockParty = {
      id: 'party1',
      status: 'active',
      songLimit: null,
      songs: [],
      duration: 30, // 30 minutes
      startedAt: past,
    };

    (mockPrisma.party.findUnique as jest.Mock).mockResolvedValue(mockParty);

    const result = await checkPartyAutoEnd('party1');

    expect(result).toBe(true);
  });

  it('should return false if limits not reached', async () => {
    const mockParty = {
      id: 'party1',
      status: 'active',
      songLimit: 10,
      songs: [{}], // Only 1 song played
      duration: 30,
      startedAt: new Date(), // Just started
    };

    (mockPrisma.party.findUnique as jest.Mock).mockResolvedValue(mockParty);

    const result = await checkPartyAutoEnd('party1');

    expect(result).toBe(false);
  });

  it('should return false if party is not active', async () => {
    const mockParty = {
      id: 'party1',
      status: 'ended',
      songLimit: 5,
      songs: [{}, {}, {}, {}, {}],
      duration: null,
      startedAt: null,
    };

    (mockPrisma.party.findUnique as jest.Mock).mockResolvedValue(mockParty);

    const result = await checkPartyAutoEnd('party1');

    expect(result).toBe(false);
  });
});

describe('getNextQueuedSong', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return next queued song by order index', async () => {
    const mockSong = {
      id: 'song1',
      title: 'Next Song',
      status: 'queued',
      orderIndex: 1,
    };

    (mockPrisma.song.findFirst as jest.Mock).mockResolvedValue(mockSong);

    const result = await getNextQueuedSong('party1');

    expect(result).toEqual(mockSong);
    expect(mockPrisma.song.findFirst).toHaveBeenCalledWith({
      where: {
        partyId: 'party1',
        status: 'queued',
      },
      orderBy: {
        orderIndex: 'asc',
      },
    });
  });

  it('should return null if no queued songs', async () => {
    (mockPrisma.song.findFirst as jest.Mock).mockResolvedValue(null);

    const result = await getNextQueuedSong('party1');

    expect(result).toBeNull();
  });
});

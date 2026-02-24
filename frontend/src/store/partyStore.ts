import { create } from "zustand";
import type { Party, Participant, Song, PartyResult } from "../types";

interface PartyState {
  // Current state
  party: Party | null;
  currentUser: Participant | null;
  connectionStatus: "connected" | "disconnected" | "reconnecting";
  error: string | null;

  // Actions
  setParty: (party: Party | null) => void;
  setCurrentUser: (user: Participant | null) => void;
  setConnectionStatus: (status: "connected" | "disconnected" | "reconnecting") => void;
  setError: (error: string | null) => void;

  // Update handlers
  updateParticipants: (participants: Participant[]) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (participantId: string) => void;

  updateSongs: (songs: Song[]) => void;
  addSong: (song: Song) => void;
  updateSong: (songId: string, updates: Partial<Song>) => void;

  updateVotes: (songId: string, votes: any[]) => void;

  startParty: (updates: Partial<Party>) => void;
  endParty: (result: PartyResult) => void;

  // Reset
  reset: () => void;
}

export const usePartyStore = create<PartyState>((set) => ({
  party: null,
  currentUser: null,
  connectionStatus: "disconnected",
  error: null,

  setParty: (party) => set({ party, error: null }),

  setCurrentUser: (user) => set({ currentUser: user }),

  setConnectionStatus: (status) => set({ connectionStatus: status }),

  setError: (error) => set({ error }),

  updateParticipants: (participants) =>
    set((state) => ({
      party: state.party
        ? { ...state.party, participants }
        : null,
    })),

  addParticipant: (participant) =>
    set((state) => ({
      party: state.party
        ? {
            ...state.party,
            participants: [...state.party.participants, participant],
          }
        : null,
    })),

  removeParticipant: (participantId) =>
    set((state) => ({
      party: state.party
        ? {
            ...state.party,
            participants: state.party.participants.filter(
              (p) => p.id !== participantId
            ),
          }
        : null,
    })),

  updateSongs: (songs) =>
    set((state) => ({
      party: state.party ? { ...state.party, songs } : null,
    })),

  addSong: (song) =>
    set((state) => ({
      party: state.party
        ? {
            ...state.party,
            songs: [...state.party.songs, song],
          }
        : null,
    })),

  updateSong: (songId, updates) =>
    set((state) => ({
      party: state.party
        ? {
            ...state.party,
            songs: state.party.songs.map((s) =>
              s.id === songId ? { ...s, ...updates } : s
            ),
          }
        : null,
    })),

  updateVotes: (songId, votes) =>
    set((state) => ({
      party: state.party
        ? {
            ...state.party,
            songs: state.party.songs.map((s) =>
              s.id === songId ? { ...s, votes } : s
            ),
          }
        : null,
    })),

  startParty: (updates) =>
    set((state) => ({
      party: state.party ? { ...state.party, ...updates } : null,
    })),

  endParty: () =>
    set((state) => ({
      party: state.party
        ? { ...state.party, status: "ended" as const }
        : null,
    })),

  reset: () =>
    set({
      party: null,
      currentUser: null,
      error: null,
    }),
}));

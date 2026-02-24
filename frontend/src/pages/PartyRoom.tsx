import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { socket } from "../lib/socket";
import { usePartyStore } from "../store/partyStore";
import type { Song, Participant, PartyResult } from "../types";

import PartyLobby from "../components/PartyLobby";
import ActiveParty from "../components/ActiveParty";
import PartyEnded from "../components/PartyEnded";
import Modal from "../components/Modal";
import ThemeToggle from "../components/ThemeToggle";

export default function PartyRoom() {
  const {
    party,
    currentUser,
    setParty,
    addParticipant,
    removeParticipant,
    addSong,
    updateSong,
    updateVotes,
    startParty,
    endParty,
    reset,
  } = usePartyStore();

  const [partyResult, setPartyResult] = useState<PartyResult | null>(null);
  const [leavePartyModal, setLeavePartyModal] = useState(false);
  const [hostLeftModal, setHostLeftModal] = useState(false);

  // Socket event handlers defined as stable callbacks
  const handleParticipantJoined = useCallback((participant: Participant) => {
    addParticipant(participant);
    toast.success(`${participant.name} joined the party!`);
  }, [addParticipant]);

  const handleParticipantLeft = useCallback((participantId: string) => {
    const participant = party?.participants.find((p) => p.id === participantId);
    if (participant) {
      toast.info(`${participant.name} left the party`);
    }
    removeParticipant(participantId);
  }, [party?.participants, removeParticipant]);

  const handleSongAdded = useCallback((song: Song) => {
    console.log(`📡 [RECEIVED] song:added event at ${new Date().toISOString()}:`, song.title);
    addSong(song);
    toast.success(`${song.addedBy.name} added ${song.title}`);
  }, [addSong]);

  const handleSongPlaying = useCallback((song: Song & { serverTimestamp?: number; startPosition?: number }) => {
    console.log(`📡 [RECEIVED] song:playing event at ${new Date().toISOString()}:`, song.title);
    updateSong(song.id, {
      status: "playing",
      serverTimestamp: song.serverTimestamp,
      startPosition: song.startPosition,
    });
    if (party) {
      startParty({ currentSongId: song.id });
    }
    toast(`Now playing: ${song.title}`, {
      icon: "🎵",
    });
  }, [party, updateSong, startParty]);

  const handleSongEnded = useCallback((songId: string) => {
    console.log(`📡 [RECEIVED] song:ended event at ${new Date().toISOString()}:`, songId);
    updateSong(songId, { status: "played" });
  }, [updateSong]);

  const handleVoteUpdated = useCallback((data: { songId: string; votes: any[] }) => {
    console.log(`📡 [RECEIVED] vote:updated event at ${new Date().toISOString()}: ${data.votes.length} votes`);
    updateVotes(data.songId, data.votes);
  }, [updateVotes]);

  const handlePlaybackSkip = useCallback((data?: { songId: string; reason: string }) => {
    console.log(`📡 [PartyRoom] Received playback:skip at ${new Date().toISOString()}:`, data);
    toast.error("⏭️ Song skipped - Too many Cut votes!", {
      duration: 4000,
    });
    // Emit song:next as backup since YouTubePlayer may not receive the event
    if (party?.code) {
      socket.emit("song:next", party.code);
      console.log(`📡 [PartyRoom] Emitted song:next to backend for party ${party.code}`);
    }
  }, [party?.code]);

  const handlePlaybackSeek = useCallback((data: { songId: string; seekTo: number; reason: string }) => {
    console.log(`📡 [PartyRoom] Received playback:seek at ${new Date().toISOString()}:`, data);
    const minutes = Math.floor(data.seekTo / 60);
    const seconds = Math.floor(data.seekTo % 60);
    toast.warning(`⏩ Skipping ahead to ${minutes}:${seconds.toString().padStart(2, '0')} - Too many Meh votes!`, {
      duration: 4000,
    });
    console.log(`📡 [PartyRoom] Note: Actual seek must be handled by YouTubePlayer component`);
  }, []);

  const handlePartyStarted = useCallback((updatedParty: any) => {
    startParty({
      status: "active",
      startedAt: updatedParty.startedAt,
      currentSongId: updatedParty.currentSongId,
    });

    // Show birthday person notification if applicable
    if (party && party.birthdayUserId && party.theme === "birthday") {
      const birthdayPerson = party.participants.find(p => p.id === party.birthdayUserId);
      if (birthdayPerson) {
        toast.success(`🎂 ${birthdayPerson.name}'s song plays first! Happy Birthday!`, {
          icon: "🎉",
          duration: 5000,
        });
      }
    } else {
      toast.success("Party started! Let the music play!", {
        icon: "🎉",
      });
    }
  }, [party, startParty]);

  const handlePartyEnded = useCallback((result: PartyResult) => {
    endParty(result);
    setPartyResult(result);
    toast("Party ended! Calculating winner...", {
      icon: "🏆",
    });
  }, [endParty]);

  const handlePartyUpdated = useCallback((updatedParty: any) => {
    setParty(updatedParty);
  }, [setParty]);

  const handlePartyRecreated = useCallback((newParty: any) => {
    console.log(`🎉 [PartyRoom] Party recreated: ${newParty.code}`);
    setParty(newParty);
    toast.success(`New party created! Code: ${newParty.code}`, {
      duration: 5000,
    });
  }, [setParty]);

  const handleHostLeft = useCallback(() => {
    setHostLeftModal(true);
  }, []);

  const handleParticipantKicked = useCallback((participantId: string) => {
    if (currentUser && participantId === currentUser.id) {
      toast.error("You have been kicked from the party");
      reset();
    }
  }, [currentUser, reset]);

  useEffect(() => {
    if (!party) return;

    console.log("🎉 [PartyRoom MOUNT] Component mounted/updated");
    console.log(`🔌 [PartyRoom] Socket ID: ${socket.id}`);
    console.log(`🔌 [PartyRoom] Socket connected: ${socket.connected}`);
    console.log(`🔌 [PartyRoom] Party code: ${party.code}`);
    console.log(`🔌 [PartyRoom] Setting up event listeners at ${new Date().toISOString()}`);

    // Register socket event listeners with named handlers
    socket.on("participant:joined", handleParticipantJoined);
    socket.on("participant:left", handleParticipantLeft);
    socket.on("song:added", handleSongAdded);
    socket.on("song:playing", handleSongPlaying);
    socket.on("song:ended", handleSongEnded);
    socket.on("vote:updated", handleVoteUpdated);
    socket.on("playback:skip", handlePlaybackSkip);
    socket.on("playback:seek", handlePlaybackSeek);
    socket.on("party:started", handlePartyStarted);
    socket.on("party:ended", handlePartyEnded);
    socket.on("party:updated", handlePartyUpdated);
    socket.on("party:recreated", handlePartyRecreated);
    socket.on("party:hostLeft", handleHostLeft);
    socket.on("participant:kicked", handleParticipantKicked);

    // Cleanup - remove only PartyRoom's listeners by passing handler references
    return () => {
      console.log("🔌 [PartyRoom CLEANUP] Removing event listeners");
      console.log(`🔌 [PartyRoom] Socket ID: ${socket.id}`);
      console.log(`🔌 [PartyRoom] Timestamp: ${new Date().toISOString()}`);
      socket.off("participant:joined", handleParticipantJoined);
      socket.off("participant:left", handleParticipantLeft);
      socket.off("song:added", handleSongAdded);
      socket.off("song:playing", handleSongPlaying);
      socket.off("song:ended", handleSongEnded);
      socket.off("vote:updated", handleVoteUpdated);
      socket.off("playback:skip", handlePlaybackSkip);
      socket.off("playback:seek", handlePlaybackSeek);
      socket.off("party:started", handlePartyStarted);
      socket.off("party:ended", handlePartyEnded);
      socket.off("party:updated", handlePartyUpdated);
      socket.off("party:recreated", handlePartyRecreated);
      socket.off("party:hostLeft", handleHostLeft);
      socket.off("participant:kicked", handleParticipantKicked);
      console.log("🔌 [PartyRoom] All listeners removed");
    };
  }, [
    party,
    currentUser,
    handleParticipantJoined,
    handleParticipantLeft,
    handleSongAdded,
    handleSongPlaying,
    handleSongEnded,
    handleVoteUpdated,
    handlePlaybackSkip,
    handlePlaybackSeek,
    handlePartyStarted,
    handlePartyEnded,
    handlePartyUpdated,
    handlePartyRecreated,
    handleHostLeft,
    handleParticipantKicked,
  ]);

  if (!party || !currentUser) {
    return null;
  }

  const handleLeaveParty = () => {
    socket.emit("party:leave", party.code);
    reset();
    toast.info("You left the party");
  };

  const leaveMessage = currentUser?.isHost
    ? "As the host, leaving will allow the party to continue without you. Are you sure you want to leave?"
    : "Are you sure you want to leave the party? You can rejoin with the party code.";

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="glass border-b-2 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 md:py-5 max-w-7xl">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg md:text-2xl font-semibold truncate text-text-primary dark:text-dark-text-primary">
                Party: {party.code}
              </h1>
              <p className="text-xs md:text-sm text-text-muted dark:text-dark-text-muted truncate">
                {currentUser.isHost ? "Host" : "Participant"}: {currentUser.name}
              </p>
            </div>

            <div className="flex items-center gap-2 md:gap-4 ml-2">
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                <span className="text-sm text-text-muted dark:text-dark-text-muted">
                  {party.participants.filter((p) => p.socketId).length} online
                </span>
              </div>

              <ThemeToggle />

              <button
                onClick={() => setLeavePartyModal(true)}
                className="btn-secondary text-xs md:text-sm whitespace-nowrap"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content based on party status */}
      <AnimatePresence mode="wait">
        {party.status === "lobby" && (
          <motion.div
            key="lobby"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <PartyLobby party={party} currentUser={currentUser} />
          </motion.div>
        )}

        {party.status === "active" && (
          <motion.div
            key="active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ActiveParty party={party} currentUser={currentUser} />
          </motion.div>
        )}

        {party.status === "ended" && partyResult && (
          <motion.div
            key="ended"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <PartyEnded result={partyResult} party={party} />
          </motion.div>
        )}
      </AnimatePresence>

      <Modal
        isOpen={leavePartyModal}
        onClose={() => setLeavePartyModal(false)}
        onConfirm={handleLeaveParty}
        title="Leave Party"
        message={leaveMessage}
        confirmText="Leave"
        cancelText="Stay"
        type="confirm"
      />

      <Modal
        isOpen={hostLeftModal}
        onClose={() => {
          setHostLeftModal(false);
          reset();
        }}
        title="Party Ended"
        message="The host has left the party. The party has ended for everyone."
        confirmText="OK"
        type="alert"
      />
    </div>
  );
}

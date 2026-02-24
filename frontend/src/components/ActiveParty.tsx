import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { socket } from "../lib/socket";
import type { Party, Participant } from "../types";
import { VIBE_SCORES } from "../types";
import { calculateProjectedScore, formatScore, getScoreColor } from "../utils/scoring";
import ParticipantList from "./ParticipantList";
import SongQueue from "./SongQueue";
import YouTubePlayer from "./YouTubePlayer";
import PartyQRCode from "./PartyQRCode";
import HostControls from "./HostControls";
import VoteEffects from "./VoteEffects";
import EmojiTheme from "./EmojiTheme";
import ConcentricCircles from "./ConcentricCircles";
import Modal from "./Modal";
import BirthdayTheme from "./BirthdayTheme";
import HipHopTheme from "./HipHopTheme";
import PunkTheme from "./PunkTheme";

interface Props {
  party: Party;
  currentUser: Participant;
}

export default function ActiveParty({ party, currentUser }: Props) {
  const currentSong = useMemo(
    () => party.songs.find((s) => s.id === party.currentSongId),
    [party.songs, party.currentSongId]
  );
  const [myVote, setMyVote] = useState<number | null>(null);
  const [votingScore, setVotingScore] = useState<number | null>(null);
  const [animationKey, setAnimationKey] = useState<number>(0);
  const [activeThemeScore, setActiveThemeScore] = useState<number | null>(null);
  const [endPartyModal, setEndPartyModal] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  useEffect(() => {
    if (currentSong) {
      const vote = currentSong.votes.find((v) => v.participantId === currentUser.id);
      setMyVote(vote?.score || null);
      // Activate theme for any vote (1-4)
      setActiveThemeScore(vote?.score || null);
    }
  }, [currentSong, currentUser.id]);

  // Track elapsed time for live score calculation
  useEffect(() => {
    if (!currentSong) {
      setElapsedSeconds(0);
      return;
    }

    // Update elapsed time every second
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [currentSong?.id]); // Reset when song changes

  const handleVote = (score: number) => {
    if (!currentSong) return;

    setMyVote(score);
    setVotingScore(score);
    setAnimationKey(prev => prev + 1); // Force new animation

    // Activate theme for any score (1-4)
    setActiveThemeScore(score);

    socket.emit("song:vote", {
      songId: currentSong.id,
      score,
    });

    // Clear voting animation after a moment
    setTimeout(() => {
      setVotingScore(null);
    }, 600);
  };

  const handleEndParty = () => {
    socket.emit("party:end", { partyCode: party.code });
  };

  if (!currentSong) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-xl text-text-muted dark:text-dark-text-muted">No song is currently playing</p>
        </div>
      </div>
    );
  }

  // Theme configurations for each score
  const themeConfigs = {
    1: { emoji: "⛔", glowColor: "rgba(220, 38, 38, 0.15)" }, // Red for Cut
    2: { emoji: "😐", glowColor: "rgba(156, 163, 175, 0.15)" }, // Gray for Meh
    3: { emoji: "👍", glowColor: "rgba(59, 130, 246, 0.15)" }, // Blue for Keep
    4: { emoji: "🔥", glowColor: "rgba(249, 115, 22, 0.15)" }, // Orange for Play
  };

  return (
    <>
      <ConcentricCircles />
      {party.theme === "birthday" && <BirthdayTheme />}
      {party.theme === "hiphop" && <HipHopTheme />}
      {party.theme === "punk" && <PunkTheme />}
      <VoteEffects />
      {/* Render theme based on active vote */}
      {activeThemeScore && activeThemeScore >= 1 && activeThemeScore <= 4 && (
        <EmojiTheme
          isActive={true}
          emoji={themeConfigs[activeThemeScore as keyof typeof themeConfigs].emoji}
          glowColor={themeConfigs[activeThemeScore as keyof typeof themeConfigs].glowColor}
        />
      )}

      <div className="container mx-auto px-4 py-8 max-w-7xl relative z-10">
        <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
        {/* Left: Now Playing */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          {/* Host Controls */}
          {currentUser.isHost && <HostControls partyCode={party.code} />}

          {/* YouTube Player */}
          <div className="card overflow-hidden">
            <YouTubePlayer
              key={currentSong.youtubeId}
              videoId={currentSong.youtubeId}
              partyCode={party.code}
              startPosition={currentSong.startPosition}
              serverTimestamp={currentSong.serverTimestamp}
            />
          </div>

          {/* Song Info & Voting */}
          <div className="card p-5 md:p-7">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-7">
              <div className="flex gap-3 md:gap-4 flex-1 min-w-0">
                <img
                  src={currentSong.thumbnail}
                  alt={currentSong.title}
                  className="w-20 h-15 md:w-24 md:h-18 object-cover rounded-xl flex-shrink-0 border border-border"
                />
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg md:text-2xl font-semibold mb-1 truncate text-text-primary dark:text-dark-text-primary">
                    {currentSong.title}
                  </h2>
                  <p className="text-sm md:text-base text-text-muted dark:text-dark-text-muted truncate">
                    {currentSong.artist}
                  </p>
                  <p className="text-xs md:text-sm text-text-muted dark:text-dark-text-muted mt-1.5 truncate">
                    Added by {currentSong.addedBy.name}
                  </p>
                </div>
              </div>

              {currentUser.isHost && (
                <button
                  onClick={() => setEndPartyModal(true)}
                  className="btn-secondary text-sm whitespace-nowrap"
                >
                  End Party
                </button>
              )}
            </div>

            {/* Vibe Score Voting */}
            <div>
              <h3 className="text-base md:text-lg font-medium mb-4 md:mb-5 text-text-primary dark:text-dark-text-primary">
                Rate this song
              </h3>

              <div className="grid grid-cols-4 gap-2 md:gap-3">
                {VIBE_SCORES.map((vibeScore) => {
                  const isVoting = votingScore === vibeScore.score;
                  const isSelected = myVote === vibeScore.score;
                  return (
                    <motion.button
                      key={vibeScore.score}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleVote(vibeScore.score)}
                      className={`glass-hover rounded-xl p-2 md:p-4 transition-all ${
                        isSelected
                          ? "accent-border !border-accent"
                          : ""
                      }`}
                    >
                      <motion.div
                        key={isVoting ? `${vibeScore.score}-${animationKey}` : vibeScore.score}
                        className="text-2xl md:text-4xl mb-1 md:mb-2 flex items-center justify-center"
                        initial={{ scale: 1, rotate: 0 }}
                        animate={
                          isVoting
                            ? {
                                scale: [1, 1.4, 1],
                                rotate: [0, 15, -15, 0],
                              }
                            : { scale: 1, rotate: 0 }
                        }
                        transition={{
                          duration: 0.5,
                          ease: "easeInOut",
                        }}
                      >
                        {vibeScore.emoji}
                      </motion.div>
                      <div className="text-xs md:text-sm font-medium text-text-primary dark:text-dark-text-primary">
                        {vibeScore.label}
                      </div>
                      <div className="text-[10px] md:text-xs text-text-muted dark:text-dark-text-muted mt-0.5 md:mt-1">
                        {vibeScore.score}/4
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {party.voteVisibility === "live" && currentSong.votes.length > 0 && (
                <div className="mt-6 glass rounded-xl p-4 border-2 border-accent/30">
                  <h4 className="font-medium mb-3 text-text-primary dark:text-dark-text-primary text-sm">Live Score</h4>
                  <div className="flex gap-4 items-center">
                    {/* Show voting emojis for visual appeal */}
                    <div className="flex gap-1 text-2xl">
                      {VIBE_SCORES.map((v) => (
                        <span key={v.score} className="opacity-60">
                          {v.emoji}
                        </span>
                      ))}
                    </div>
                    <div className="flex-1">
                      {(() => {
                        const projectedScore = calculateProjectedScore(currentSong, elapsedSeconds);
                        const scoreColor = getScoreColor(projectedScore);

                        return (
                          <>
                            <div className={`text-3xl font-bold ${scoreColor}`}>
                              {projectedScore !== null ? formatScore(projectedScore) : "—"}
                              <span className="text-lg text-text-muted dark:text-dark-text-muted ml-1">/100</span>
                            </div>
                            <div className="text-xs text-text-muted dark:text-dark-text-muted mt-1">
                              Projected • Updates live
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {party.voteVisibility === "hidden" && (
                <div className="mt-4 text-center text-sm text-text-muted dark:text-dark-text-muted">
                  Votes are hidden until the party ends
                </div>
              )}
            </div>
          </div>

          {/* Queue */}
          <div className="card p-5 md:p-6">
            <h3 className="text-lg md:text-xl font-medium mb-4 text-text-primary dark:text-dark-text-primary">Up Next</h3>
            <SongQueue
              songs={party.songs.filter((s) => s.status === "queued")}
              showVotes={party.voteVisibility === "live"}
            />
          </div>
        </div>

        {/* Right: Participants */}
        <div className="lg:col-span-1 space-y-4 md:space-y-6">
          <ParticipantList
            participants={party.participants}
            currentUserId={currentUser.id}
            isHost={currentUser.isHost}
            partyCode={party.code}
            birthdayUserId={party.birthdayUserId}
            isBirthdayTheme={party.theme === "birthday"}
          />
          <PartyQRCode partyCode={party.code} />
        </div>
      </div>

      <Modal
        isOpen={endPartyModal}
        onClose={() => setEndPartyModal(false)}
        onConfirm={handleEndParty}
        title="End Party"
        message="Are you sure you want to end the party? This will calculate final scores and show the winner."
        confirmText="End Party"
        cancelText="Cancel"
        type="confirm"
      />
    </div>
    </>
  );
}

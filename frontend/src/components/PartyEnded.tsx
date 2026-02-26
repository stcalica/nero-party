import { motion } from "framer-motion";
import { useState } from "react";
import { usePartyStore } from "../store/partyStore";
import type { PartyResult, Party } from "../types";
import { VIBE_SCORES } from "../types";
import { formatScore, getScoreColor, getMedalEmoji } from "../utils/scoring";
import ConcentricCircles from "./ConcentricCircles";
import EmojiTheme from "./EmojiTheme";
import Modal from "./Modal";
import BirthdayTheme from "./BirthdayTheme";
import HipHopTheme from "./HipHopTheme";
import PunkTheme from "./PunkTheme";
import { socket } from "../lib/socket";
import { toast } from "sonner";

interface PartyEndedProps {
  result: PartyResult;
  party: Party;
}

// Theme configurations for winner's score
const themeConfigs: Record<number, { emoji: string; glowColor: string }> = {
  1: { emoji: "⛔", glowColor: "rgba(220, 38, 38, 0.15)" }, // Red for Cut
  2: { emoji: "😐", glowColor: "rgba(156, 163, 175, 0.15)" }, // Gray for Meh
  3: { emoji: "👍", glowColor: "rgba(59, 130, 246, 0.15)" }, // Blue for Keep
  4: { emoji: "🔥", glowColor: "rgba(249, 115, 22, 0.15)" }, // Orange for Play
};

export default function PartyEnded({ result, party }: PartyEndedProps) {
  const [createNewPartyModal, setCreateNewPartyModal] = useState(false);
  const [isRecreating, setIsRecreating] = useState(false);

  const handleRecreateParty = () => {
    setIsRecreating(true);

    socket.emit("party:recreate", {
      previousPartyCode: party.code,
    }, (response: any) => {
      setIsRecreating(false);
      setCreateNewPartyModal(false);

      if (response.success) {
        toast.success("New party created! Returning to lobby...");
        // The party:recreated event will be handled by PartyRoom component
      } else {
        toast.error(response.error || "Failed to create new party");
      }
    });
  };

  // Determine winner's theme based on average score
  const winnerScore = result.winner ? Math.round(result.winner.averageScore) : null;
  console.log(`winner score: ${winnerScore}`)
  const winnerTheme = winnerScore && winnerScore >= 1 && winnerScore <= 4
    ? themeConfigs[winnerScore]
    : null;
  if (!result.winner) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-3xl font-bold mb-4">Party Ended</h2>
          <p className="text-text-muted">Not enough votes to determine a winner</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {party.theme !== "punk" && <ConcentricCircles />}
      {party.theme === "birthday" && <BirthdayTheme />}
      {party.theme === "hiphop" && <HipHopTheme />}
      {party.theme === "punk" && <PunkTheme />}
      {winnerTheme && (
        <EmojiTheme
          isActive={true}
          emoji={winnerTheme.emoji}
          glowColor={winnerTheme.glowColor}
        />
      )}
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-4xl mx-auto">
        {/* Winner Announcement */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="glass rounded-3xl p-8 mb-8 text-center relative overflow-hidden"
        >
          {/* Confetti background effect */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-1/4 w-2 h-2 bg-yellow-400 rounded-full animate-bounce" />
            <div className="absolute top-10 right-1/4 w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
            <div className="absolute bottom-10 left-1/3 w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
          </div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-8xl mb-4"
          >
            🏆
          </motion.div>

          <h1 className="text-4xl font-bold mb-2">Winner!</h1>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-6"
          >
            <img
              src={result.winner.thumbnail}
              alt={result.winner.title}
              className="w-48 h-36 object-cover rounded-xl mx-auto mb-4"
            />

            <h2 className="text-3xl font-bold mb-2">{result.winner.title}</h2>
            <p className="text-xl text-text-muted mb-4">{result.winner.artist}</p>

            <div className="flex items-center justify-center gap-4 mb-6">
              {/* Show voting emojis for visual appeal */}
              <div className="flex gap-2 text-4xl opacity-60">
                {VIBE_SCORES.map((v) => (
                  <span key={v.score}>{v.emoji}</span>
                ))}
              </div>

              <div className="h-16 w-px bg-border dark:bg-dark-border" />

              {/* Display FinalScore prominently */}
              <div className="text-center">
                <div className={`text-6xl font-black ${getScoreColor(result.winner.finalScore)}`}>
                  {result.winner.finalScore !== null && result.winner.finalScore !== undefined
                    ? formatScore(result.winner.finalScore)
                    : "—"}
                </div>
                <div className="text-2xl text-text-muted mt-1">/ 100</div>
                <div className="text-sm text-text-muted mt-1">Final Score</div>
              </div>
            </div>

            <p className="text-text-muted">
              Added by <span className="text-text-primary dark:text-dark-text-primary font-semibold">{result.winner.addedByName}</span>
            </p>
          </motion.div>
        </motion.div>

        {/* Final Standings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass rounded-2xl p-6"
        >
          <h2 className="text-2xl font-bold mb-4">Final Standings</h2>

          <div className="space-y-3">
            {result.allSongs.map((song, index) => {
              const position = index + 1;
              const medal = getMedalEmoji(position);
              const hasFinalScore = song.finalScore !== null && song.finalScore !== undefined;

              return (
                <motion.div
                  key={song.songId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                  className={`glass-hover rounded-lg p-4 flex items-center gap-4 ${
                    index === 0 ? "ring-2 ring-yellow-500 bg-yellow-500/10" : ""
                  }`}
                >
                  {/* Position with medal for top 3 */}
                  <div className="text-center w-12">
                    {medal ? (
                      <div className="text-3xl">{medal}</div>
                    ) : (
                      <div className="text-2xl font-bold text-text-muted">#{position}</div>
                    )}
                  </div>

                  <img
                    src={song.thumbnail}
                    alt={song.title}
                    className="w-16 h-12 object-cover rounded-lg"
                  />

                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{song.title}</h3>
                    <p className="text-sm text-text-muted truncate">{song.artist}</p>
                    <p className="text-xs text-text-muted">by {song.addedByName}</p>
                  </div>

                  {/* Show FinalScore and emojis */}
                  <div className="text-right flex items-center gap-3">
                    {/* Voting emojis for visual appeal */}
                    <div className="flex gap-0.5 text-lg opacity-50">
                      {VIBE_SCORES.map((v) => (
                        <span key={v.score}>{v.emoji}</span>
                      ))}
                    </div>

                    {/* FinalScore display */}
                    <div className="min-w-[80px]">
                      {hasFinalScore ? (
                        <>
                          <div className={`text-2xl font-bold ${getScoreColor(song.finalScore)}`}>
                            {formatScore(song.finalScore)}
                          </div>
                          <div className="text-xs text-text-muted">/100</div>
                        </>
                      ) : (
                        <div className="text-xl text-text-muted">—</div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Party Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-6 glass rounded-2xl p-6"
        >
          <h3 className="text-lg font-bold mb-4">Party Stats</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{party.songs.length}</div>
              <div className="text-sm text-text-muted">Songs Played</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{party.participants.length}</div>
              <div className="text-sm text-text-muted">Participants</div>
            </div>
            <div>
              {(() => {
                const songsWithScores = result.allSongs.filter(
                  (s) => s.finalScore !== null && s.finalScore !== undefined
                );
                const highestScore = songsWithScores.length > 0
                  ? Math.max(...songsWithScores.map((s) => s.finalScore!))
                  : 0;

                return (
                  <>
                    <div className={`text-2xl font-bold ${getScoreColor(highestScore)}`}>
                      {songsWithScores.length > 0 ? formatScore(highestScore) : "—"}
                    </div>
                    <div className="text-sm text-text-muted">Highest Score</div>
                  </>
                );
              })()}
            </div>
          </div>
        </motion.div>

        {/* Play Again Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-6 text-center"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setCreateNewPartyModal(true)}
            className="btn-primary text-lg px-8"
          >
            Create New Party
          </motion.button>
        </motion.div>
        </div>
      </div>

      <Modal
        isOpen={createNewPartyModal}
        onClose={() => !isRecreating && setCreateNewPartyModal(false)}
        onConfirm={handleRecreateParty}
        title="Play Again?"
        message="Start a new party with the same participants? Everyone will be moved to a new lobby with a new party code."
        confirmText={isRecreating ? "Creating..." : "Play Again"}
        cancelText="Not Now"
        type="confirm"
      />
    </>
  );
}

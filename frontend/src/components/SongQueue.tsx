import { motion } from "framer-motion";
import type { Song } from "../types";
import { VIBE_SCORES } from "../types";
import { formatScore, getScoreColor } from "../utils/scoring";

interface SongQueueProps {
  songs: Song[];
  showVotes: boolean;
}

export default function SongQueue({ songs, showVotes }: SongQueueProps) {
  // Helper to check if song has a final score
  const hasFinalScore = (song: Song & { finalScore?: number }) => {
    return song.finalScore !== null && song.finalScore !== undefined;
  };

  return (
    <div className="space-y-2">
      {songs.map((song, index) => {
        const songWithScore = song as Song & { finalScore?: number };

        return (
          <motion.div
            key={song.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`glass-hover rounded-lg p-3 flex items-center gap-3 ${
              song.status === "playing"
                ? "ring-2 ring-primary-500 bg-primary-500/10"
                : song.status === "played"
                ? "opacity-50"
                : ""
            }`}
          >
            <img
              src={song.thumbnail}
              alt={song.title}
              className="w-16 h-12 object-cover rounded-lg"
            />

            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate">{song.title}</h3>
              <p className="text-sm text-text-muted truncate">{song.artist}</p>
              <p className="text-xs text-text-muted">
                Added by {song.addedBy.name}
              </p>
            </div>

            {song.status === "playing" && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                <span className="text-sm text-accent font-medium">
                  Now Playing
                </span>
              </div>
            )}

            {/* Show FinalScore for completed songs, emojis for queued songs */}
            {showVotes && song.status === "played" && hasFinalScore(songWithScore) && (
              <div className="text-right">
                <div className={`text-2xl font-bold ${getScoreColor(songWithScore.finalScore)}`}>
                  {formatScore(songWithScore.finalScore)}
                  <span className="text-sm text-text-muted ml-1">/100</span>
                </div>
                <p className="text-xs text-text-muted">Final Score</p>
              </div>
            )}

            {showVotes && song.status === "queued" && song.votes.length > 0 && (
              <div className="flex gap-1 text-xl opacity-60">
                {VIBE_SCORES.map((v) => (
                  <span key={v.score}>{v.emoji}</span>
                ))}
              </div>
            )}

            {showVotes && song.votes.length === 0 && song.status === "queued" && (
              <span className="text-sm text-text-muted">Awaiting votes</span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

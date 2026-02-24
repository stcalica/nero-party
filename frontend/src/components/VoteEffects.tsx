import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { socket } from "../lib/socket";

interface Particle {
  id: number;
  emoji: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  duration: number;
}

export default function VoteEffects() {
  const [particles, setParticles] = useState<Particle[]>();
  const [background, setBackground] = useState<string>("");

  useEffect(() => {
    const handleVoteUpdated = (data: { songId: string; votes: any[] }) => {
      if (data.votes.length === 0) return;

      // Get the most recent vote
      const latestVote = data.votes[data.votes.length - 1];
      const score = latestVote.score;

      // Trigger particle effect
      triggerParticles(score);

      // Trigger background effect
      triggerBackground(score);
    };

    socket.on("vote:updated", handleVoteUpdated);

    return () => {
      socket.off("vote:updated", handleVoteUpdated);
    };
  }, []);

  const triggerParticles = (score: number) => {
    const emojiMap: { [key: number]: string[] } = {
      1: ["👎", "👎", "👎"], // Terrible
      2: ["😴", "💤", "😪"], // Boring
      3: ["🎵", "🎶", "🎼"], // Okay
      4: ["🔥", "💥", "🌟"], // Fire
    };

    const emojis = emojiMap[score] || ["🎵"];
    const particleCount = score === 4 ? 30 : score === 3 ? 20 : 15;

    const newParticles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      newParticles.push({
        id: Date.now() + i,
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
        x: Math.random() * 100,
        y: -10 + Math.random() * 20,
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 1,
        duration: 2 + Math.random() * 2,
      });
    }

    setParticles(newParticles);

    // Clear particles after animation
    setTimeout(() => {
      setParticles([]);
    }, 4000);
  };

  const triggerBackground = (score: number) => {
    const backgroundMap: { [key: number]: string } = {
      1: "radial-gradient(circle at 50% 50%, rgba(139, 0, 0, 0.3) 0%, transparent 70%)", // Dark red
      2: "radial-gradient(circle at 50% 50%, rgba(75, 85, 99, 0.3) 0%, transparent 70%)", // Gray
      3: "radial-gradient(circle at 50% 50%, rgba(147, 51, 234, 0.2) 0%, transparent 70%)", // Purple
      4: "radial-gradient(circle at 50% 50%, rgba(249, 115, 22, 0.4) 0%, transparent 60%)", // Orange/Fire
    };

    setBackground(backgroundMap[score] || "");

    // Clear background after a moment
    setTimeout(() => {
      setBackground("");
    }, 3000);
  };

  return (
    <>
      {/* Background Effect */}
      <motion.div
        className="fixed inset-0 pointer-events-none z-0"
        initial={{ opacity: 0 }}
        animate={{
          opacity: background ? 1 : 0,
          background,
        }}
        transition={{ duration: 0.5 }}
      />

      {/* Particle Effects */}
      <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
        <AnimatePresence>
          {particles?.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute text-4xl"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
              }}
              initial={{
                opacity: 1,
                scale: 0,
                rotate: 0,
                y: 0,
              }}
              animate={{
                opacity: [1, 1, 0],
                scale: [0, particle.scale, particle.scale * 0.5],
                rotate: particle.rotation,
                y: window.innerHeight + 100,
              }}
              exit={{
                opacity: 0,
              }}
              transition={{
                duration: particle.duration,
                ease: "easeOut",
              }}
            >
              {particle.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}

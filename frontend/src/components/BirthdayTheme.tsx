import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface BirthdayParticle {
  id: number;
  emoji: string;
  x: number;
  delay: number;
  duration: number;
  size: number;
}

export default function BirthdayTheme() {
  const [particles, setParticles] = useState<BirthdayParticle[]>([]);

  useEffect(() => {
    // Initial particles
    const initialParticles: BirthdayParticle[] = [];
    const emojis = ["🎂", "🎉", "🎈", "🎁", "🍰", "✨", "🎊"];

    for (let i = 0; i < 25; i++) {
      initialParticles.push({
        id: i,
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
        x: Math.random() * 100,
        delay: Math.random() * 2,
        duration: 4 + Math.random() * 3,
        size: 1 + Math.random() * 1.5,
      });
    }

    setParticles(initialParticles);

    // Continuous spawning
    const interval = setInterval(() => {
      setParticles((prev) => {
        const newParticle: BirthdayParticle = {
          id: Date.now() + Math.random(),
          emoji: emojis[Math.floor(Math.random() * emojis.length)],
          x: Math.random() * 100,
          delay: 0,
          duration: 4 + Math.random() * 3,
          size: 1 + Math.random() * 1.5,
        };

        // Keep only the most recent 30 particles to prevent memory issues
        const updated = [...prev, newParticle];
        return updated.slice(-30);
      });
    }, 600);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Gradient background overlay - pink to yellow birthday colors */}
      <motion.div
        className="fixed inset-0 pointer-events-none z-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          background: "radial-gradient(circle at 50% 50%, rgba(236, 72, 153, 0.08) 0%, rgba(251, 191, 36, 0.05) 50%, transparent 70%)",
        }}
      />

      {/* Confetti and celebration emojis */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute text-3xl"
            initial={{
              opacity: 0,
              y: -50,
              x: `${particle.x}vw`,
              rotate: 0,
              scale: particle.size
            }}
            animate={{
              opacity: [0, 1, 1, 0.7, 0],
              y: typeof window !== 'undefined' ? window.innerHeight + 100 : 1000,
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              ease: "linear",
            }}
          >
            {particle.emoji}
          </motion.div>
        ))}
      </div>

      {/* Pulsing border glow - birthday cake colors (pink/yellow) */}
      <motion.div
        className="fixed inset-0 pointer-events-none z-0 rounded-3xl"
        animate={{
          boxShadow: [
            "inset 0 0 60px 15px rgba(236, 72, 153, 0.2)",  // Pink
            "inset 0 0 80px 25px rgba(251, 191, 36, 0.25)", // Yellow
            "inset 0 0 60px 15px rgba(236, 72, 153, 0.2)",  // Pink
          ],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </>
  );
}

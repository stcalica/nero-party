import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface EmojiParticle {
  id: number;
  x: number;
  delay: number;
  duration: number;
  size: number;
}

interface EmojiThemeProps {
  isActive: boolean;
  emoji: string;
  glowColor: string; // rgba format
}

export default function EmojiTheme({ isActive, emoji, glowColor }: EmojiThemeProps) {
  const [particles, setParticles] = useState<EmojiParticle[]>([]);

  useEffect(() => {
    if (!isActive) {
      setParticles([]);
      return;
    }

    // Create initial particles
    const initialParticles: EmojiParticle[] = [];
    for (let i = 0; i < 20; i++) {
      initialParticles.push({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 2,
        duration: 3 + Math.random() * 2,
        size: 1 + Math.random() * 1.5,
      });
    }
    setParticles(initialParticles);

    // Add new particles periodically
    const interval = setInterval(() => {
      setParticles((prev) => {
        const newParticles = [...prev];
        // Add 2-3 new particles
        const count = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) {
          newParticles.push({
            id: Date.now() + Math.random(),
            x: Math.random() * 100,
            delay: 0,
            duration: 3 + Math.random() * 2,
            size: 1 + Math.random() * 1.5,
          });
        }
        // Keep only the most recent 30 particles
        return newParticles.slice(-30);
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isActive]);

  if (!isActive) return null;

  return (
    <>
      {/* Soft glow outline effect */}
      <motion.div
        className="fixed inset-0 pointer-events-none z-[60]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          boxShadow: `inset 0 0 100px 30px ${glowColor}`,
        }}
      >
        <motion.div
          className="absolute inset-0"
          animate={{
            boxShadow: [
              `inset 0 0 100px 30px ${glowColor}`,
              `inset 0 0 120px 40px ${glowColor.replace(/[\d.]+\)/, (m) => (parseFloat(m) * 1.5).toFixed(2) + ')')}`,
              `inset 0 0 100px 30px ${glowColor}`,
            ],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.div>

      {/* Raining emojis */}
      <div className="fixed inset-0 pointer-events-none z-[59] overflow-hidden">
        <AnimatePresence>
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute text-2xl md:text-3xl"
              style={{
                left: `${particle.x}%`,
                top: "-50px",
              }}
              initial={{
                opacity: 0,
                y: 0,
                rotate: 0,
              }}
              animate={{
                opacity: [0, 1, 1, 0.5, 0],
                y: window.innerHeight + 100,
                rotate: [0, 180, 360],
              }}
              exit={{
                opacity: 0,
              }}
              transition={{
                delay: particle.delay,
                duration: particle.duration,
                ease: "linear",
              }}
            >
              <span style={{ fontSize: `${particle.size}rem` }}>{emoji}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}

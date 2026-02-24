import { motion } from "framer-motion";

export default function PunkTheme() {
  // Rock/punk emojis scattered around
  const punkEmojis = [
    { id: 1, emoji: "🤘", position: "top-12 left-12", size: "text-5xl", rotation: -15 },
    { id: 2, emoji: "⚡", position: "top-20 right-16", size: "text-4xl", rotation: 20 },
    { id: 3, emoji: "🎸", position: "bottom-24 left-20", size: "text-6xl", rotation: -25 },
    { id: 4, emoji: "💀", position: "bottom-16 right-12", size: "text-5xl", rotation: 15 },
    { id: 5, emoji: "🤘", position: "top-1/3 right-1/4", size: "text-4xl opacity-40", rotation: 45 },
    { id: 6, emoji: "⚡", position: "bottom-1/3 left-1/3", size: "text-3xl opacity-40", rotation: -30 },
  ];

  return (
    <>
      {/* Red and black gradient background - punk vibes */}
      <motion.div
        className="fixed inset-0 pointer-events-none z-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          background: "linear-gradient(135deg, rgba(220, 38, 38, 0.15) 0%, rgba(0, 0, 0, 0.25) 50%, rgba(127, 29, 29, 0.18) 100%)",
        }}
      />

      {/* Punk/rock emojis */}
      {punkEmojis.map((item) => (
        <motion.div
          key={item.id}
          className={`fixed ${item.position} ${item.size} pointer-events-none z-0`}
          initial={{ opacity: 0, scale: 0.5, rotate: item.rotation }}
          animate={{
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.15, 1],
            rotate: [item.rotation, item.rotation + 10, item.rotation],
          }}
          transition={{
            delay: Math.random() * 0.5,
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {item.emoji}
        </motion.div>
      ))}

      {/* Pulsing red/black border glow */}
      <motion.div
        className="fixed inset-0 pointer-events-none z-0 rounded-3xl"
        animate={{
          boxShadow: [
            "inset 0 0 60px 15px rgba(220, 38, 38, 0.2)",  // Red
            "inset 0 0 80px 25px rgba(0, 0, 0, 0.3)",      // Black
            "inset 0 0 60px 15px rgba(220, 38, 38, 0.2)",  // Red
          ],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Jagged lightning effects */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 bg-gradient-to-b from-transparent via-red-600/30 to-transparent"
            style={{
              left: `${25 + i * 25}%`,
              height: "100%",
            }}
            animate={{
              opacity: [0, 0.5, 0],
              scaleY: [0.5, 1, 0.5],
            }}
            transition={{
              delay: i * 0.4,
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Diagonal stripes effect (punk aesthetic) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-10">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute h-[200%] w-8 bg-red-800 top-1/2 -translate-y-1/2"
            style={{
              left: `${i * 20}%`,
              transform: "rotate(-45deg) translateX(-50%)",
            }}
          />
        ))}
      </div>
    </>
  );
}

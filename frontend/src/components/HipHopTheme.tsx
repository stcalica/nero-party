import { motion } from "framer-motion";

export default function HipHopTheme() {
  // Speaker emojis in corners and floating
  const speakers = [
    { id: 1, position: "top-8 left-8", size: "text-6xl", delay: 0 },
    { id: 2, position: "top-8 right-8", size: "text-6xl", delay: 0.2 },
    { id: 3, position: "bottom-8 left-8", size: "text-6xl", delay: 0.4 },
    { id: 4, position: "bottom-8 right-8", size: "text-6xl", delay: 0.6 },
    { id: 5, position: "top-1/4 left-1/4", size: "text-4xl opacity-30", delay: 0.8 },
    { id: 6, position: "top-3/4 right-1/4", size: "text-4xl opacity-30", delay: 1 },
  ];

  return (
    <>
      {/* Purple gradient background - hip hop vibes */}
      <motion.div
        className="fixed inset-0 pointer-events-none z-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          background: "linear-gradient(135deg, rgba(147, 51, 234, 0.15) 0%, rgba(168, 85, 247, 0.10) 50%, rgba(192, 132, 252, 0.08) 100%)",
        }}
      />

      {/* Speaker emojis */}
      {speakers.map((speaker) => (
        <motion.div
          key={speaker.id}
          className={`fixed ${speaker.position} ${speaker.size} pointer-events-none z-0`}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{
            opacity: [0.4, 0.7, 0.4],
            scale: [1, 1.1, 1],
          }}
          transition={{
            delay: speaker.delay,
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          🔊
        </motion.div>
      ))}

      {/* Pulsing purple border glow */}
      <motion.div
        className="fixed inset-0 pointer-events-none z-0 rounded-3xl"
        animate={{
          boxShadow: [
            "inset 0 0 60px 15px rgba(147, 51, 234, 0.15)",
            "inset 0 0 80px 25px rgba(168, 85, 247, 0.2)",
            "inset 0 0 60px 15px rgba(147, 51, 234, 0.15)",
          ],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Sound wave effect */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-500/20 to-transparent"
            style={{ top: `${20 + i * 15}%` }}
            animate={{
              opacity: [0.1, 0.3, 0.1],
              scaleX: [0.8, 1.2, 0.8],
            }}
            transition={{
              delay: i * 0.2,
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </>
  );
}

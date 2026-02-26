import { motion } from "framer-motion";
import { useState, useEffect } from "react";

export default function PunkTheme() {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Calculate angle from center of screen to mouse
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
      setRotation(angle);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <>
      {/* Dark purple and green gradient background - punk vibes */}
      <motion.div
        className="fixed inset-0 pointer-events-none z-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          background: "linear-gradient(135deg, rgba(54, 23, 43, 0.4) 0%, rgba(70, 208, 15, 0.08) 50%, rgba(54, 23, 43, 0.35) 100%)",
        }}
      />

      {/* Large skull emoji that looks at the mouse */}
      <motion.div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0"
        style={{
          fontSize: "35rem",
          opacity: 0.18,
          rotate: rotation,
        }}
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        💀
      </motion.div>

    </>
  );
}

import { useEffect, useRef, useState } from "react";
import { motion, useSpring, useMotionValue } from "framer-motion";

interface Circle {
  id: number;
  baseSize: number;
  delay: number;
}

interface ConcentricCirclesProps {
  color?: "dark" | "light";
}

export default function ConcentricCircles({ color = "light" }: ConcentricCirclesProps) {
  const colors = {
    dark: "75, 85, 99", // rgb for dark grey
    light: "156, 163, 175", // rgb for light grey
  };

  const rgb = colors[color];
  const [circles] = useState<Circle[]>(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      id: i,
      baseSize: 150 + i * 120,
      delay: i * 0.2,
    }));
  });

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const smoothMouseX = useSpring(mouseX, {
    damping: 50,
    stiffness: 200,
    mass: 0.5,
  });

  const smoothMouseY = useSpring(mouseY, {
    damping: 50,
    stiffness: 200,
    mass: 0.5,
  });

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Calculate offset from center (normalized to -1 to 1)
      const offsetX = (e.clientX - rect.left - centerX) / centerX;
      const offsetY = (e.clientY - rect.top - centerY) / centerY;

      // Set motion values (will be smoothed by spring)
      mouseX.set(offsetX * 80); // Max 80px movement
      mouseY.set(offsetY * 80);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none overflow-hidden z-0"
      style={{
        background: "transparent",
      }}
    >
      {/* Center point that follows mouse smoothly */}
      <motion.div
        className="absolute"
        style={{
          left: "50%",
          top: "50%",
          x: smoothMouseX,
          y: smoothMouseY,
        }}
      >
        {circles.map((circle) => (
          <motion.div
            key={circle.id}
            className="absolute rounded-full"
            style={{
              width: circle.baseSize,
              height: circle.baseSize,
              left: -circle.baseSize / 2,
              top: -circle.baseSize / 2,
              border: `3px solid rgba(${rgb}, ${0.4 - circle.id * 0.04})`,
            }}
            animate={{
              scale: [1, 1.08, 1],
              opacity: [0.6, 0.9, 0.6],
            }}
            transition={{
              duration: 4 + circle.delay,
              repeat: Infinity,
              ease: "easeInOut",
              delay: circle.delay,
            }}
          />
        ))}

        {/* Inner glow circles with different timing */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={`glow-${i}`}
            className="absolute rounded-full"
            style={{
              width: 100 + i * 60,
              height: 100 + i * 60,
              left: -(100 + i * 60) / 2,
              top: -(100 + i * 60) / 2,
              background: `radial-gradient(circle, rgba(${rgb}, ${0.35 - i * 0.08}) 0%, transparent 70%)`,
            }}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.3,
            }}
          />
        ))}
      </motion.div>

      {/* Static corner circles for depth */}
      {[
        { x: "10%", y: "15%" },
        { x: "85%", y: "20%" },
        { x: "15%", y: "80%" },
        { x: "88%", y: "85%" },
      ].map((pos, i) => (
        <motion.div
          key={`corner-${i}`}
          className="absolute rounded-full"
          style={{
            width: 200,
            height: 200,
            left: pos.x,
            top: pos.y,
            border: `3px solid rgba(${rgb}, 0.2)`,
          }}
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{
            duration: 6 + i,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.5,
          }}
        />
      ))}
    </div>
  );
}

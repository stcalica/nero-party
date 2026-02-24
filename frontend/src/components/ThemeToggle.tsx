import { motion } from "framer-motion";
import { useThemeStore } from "../store/themeStore";

export default function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useThemeStore();

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleTheme}
      className="glass-hover rounded-lg p-2 transition-all"
      title={resolvedTheme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      aria-label="Toggle theme"
    >
      <motion.span
        key={resolvedTheme}
        initial={{ rotate: -90, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="text-xl block"
      >
        {resolvedTheme === "light" ? "🌙" : "☀️"}
      </motion.span>
    </motion.button>
  );
}

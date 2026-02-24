import { create } from "zustand";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeStore {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

// Get system preference
const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

// Get stored theme or default to system
const getInitialTheme = (): Theme => {
  if (typeof window === "undefined") return "system";
  const stored = localStorage.getItem("theme") as Theme;
  return stored || "system";
};

// Resolve theme to actual light/dark value
const resolveTheme = (theme: Theme): ResolvedTheme => {
  if (theme === "system") {
    return getSystemTheme();
  }
  return theme;
};

export const useThemeStore = create<ThemeStore>((set, get) => {
  const initialTheme = getInitialTheme();
  const initialResolvedTheme = resolveTheme(initialTheme);

  // Listen for system theme changes
  if (typeof window !== "undefined") {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
      const { theme } = get();
      if (theme === "system") {
        set({ resolvedTheme: e.matches ? "dark" : "light" });
      }
    });
  }

  return {
    theme: initialTheme,
    resolvedTheme: initialResolvedTheme,

    setTheme: (theme: Theme) => {
      const resolved = resolveTheme(theme);
      localStorage.setItem("theme", theme);
      set({ theme, resolvedTheme: resolved });
    },

    toggleTheme: () => {
      const { resolvedTheme } = get();
      const newTheme: Theme = resolvedTheme === "light" ? "dark" : "light";
      const resolved = resolveTheme(newTheme);
      localStorage.setItem("theme", newTheme);
      set({ theme: newTheme, resolvedTheme: resolved });
    },
  };
});

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { socket } from "../lib/socket";
import { usePartyStore } from "../store/partyStore";
import { toast } from "sonner";
import ConcentricCircles from "../components/ConcentricCircles";
import ThemeToggle from "../components/ThemeToggle";

export default function Home() {
  const [view, setView] = useState<"home" | "create" | "join">("home");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Create party config
  const [duration, setDuration] = useState<number | null>(30);
  const [songLimit, setSongLimit] = useState<number | null>(20);
  const [voteVisibility, setVoteVisibility] = useState<"live" | "hidden">("live");
  const [theme, setTheme] = useState<"default" | "birthday" | "hiphop" | "punk">("default");

  const { setParty, setCurrentUser } = usePartyStore();

  // Check for QR code join parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get("join");
    if (joinCode) {
      setCode(joinCode.toUpperCase());
      setView("join");
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleCreateParty = () => {
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    setIsLoading(true);

    socket.emit(
      "party:create",
      {
        hostName: name.trim(),
        config: { duration, songLimit, voteVisibility, theme, birthdayUserId: null },
      },
      (response: any) => {
        setIsLoading(false);

        if (response.success) {
          setParty(response.party);
          setCurrentUser(response.party.participants[0]);
          toast.success(`Party created! Code: ${response.party.code}`);
        } else {
          toast.error(response.error || "Failed to create party");
        }
      }
    );
  };

  const handleJoinParty = () => {
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    if (!code.trim() || code.length !== 6) {
      toast.error("Please enter a valid 6-character code");
      return;
    }

    setIsLoading(true);

    socket.emit(
      "party:join",
      {
        code: code.toUpperCase(),
        name: name.trim(),
      },
      (response: any) => {
        setIsLoading(false);

        if (response.success) {
          setParty(response.party);
          const currentUser = response.party.participants.find(
            (p: any) => p.socketId === socket.id
          );
          setCurrentUser(currentUser);
          toast.success(`Joined party ${code.toUpperCase()}!`);
        } else {
          toast.error(response.error || "Failed to join party");
        }
      }
    );
  };

  if (view === "create") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 md:p-8 relative">
        <div className="fixed top-4 right-4 z-50">
          <ThemeToggle />
        </div>
        <ConcentricCircles color="dark" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-8 md:p-10 max-w-md w-full relative z-10"
        >
          <button
            onClick={() => setView("home")}
            className="mb-6 text-text-muted dark:text-dark-text-muted hover:text-text-primary dark:hover:text-dark-text-primary transition-colors"
          >
            ← Back
          </button>

          <h1 className="text-3xl font-semibold mb-2 text-text-primary dark:text-dark-text-primary">Create Party</h1>
          <p className="text-text-muted dark:text-dark-text-muted mb-8">Set up your listening party</p>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2 text-text-primary dark:text-dark-text-primary">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="input"
                maxLength={20}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-text-primary dark:text-dark-text-primary">Duration</label>
              <select
                value={duration || "unlimited"}
                onChange={(e) =>
                  setDuration(e.target.value === "unlimited" ? null : Number(e.target.value))
                }
                className="input"
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="120">2 hours</option>
                <option value="unlimited">Unlimited</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-text-primary dark:text-dark-text-primary">Song Limit</label>
              <select
                value={songLimit || "unlimited"}
                onChange={(e) =>
                  setSongLimit(e.target.value === "unlimited" ? null : Number(e.target.value))
                }
                className="input"
              >
                <option value="10">10 songs</option>
                <option value="20">20 songs</option>
                <option value="50">50 songs</option>
                <option value="unlimited">Unlimited</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-text-primary dark:text-dark-text-primary">Vote Visibility</label>
              <select
                value={voteVisibility}
                onChange={(e) => setVoteVisibility(e.target.value as "live" | "hidden")}
                className="input"
              >
                <option value="live">Live (see votes in real-time)</option>
                <option value="hidden">Hidden (revealed at end)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-text-primary dark:text-dark-text-primary">Party Vibe</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
                className="input"
              >
                <option value="default">🎉 Default</option>
                <option value="birthday">🎂 Birthday Celebration</option>
                <option value="hiphop">🎤 Hip Hop</option>
                <option value="punk">🤘 Punk Rocker</option>
              </select>
              {theme === "birthday" && (
                <p className="text-xs text-text-muted dark:text-dark-text-muted mt-2">
                  💡 You can select the birthday person from the lobby after creating the party
                </p>
              )}
            </div>

            <button
              onClick={handleCreateParty}
              disabled={isLoading}
              className={isLoading ? "btn-disabled w-full mt-2" : "btn-primary w-full mt-2"}
            >
              {isLoading ? "Creating..." : "Create Party"}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (view === "join") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 md:p-8 relative">
        <div className="fixed top-4 right-4 z-50">
          <ThemeToggle />
        </div>
        <ConcentricCircles color="dark" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-8 md:p-10 max-w-md w-full relative z-10"
        >
          <button
            onClick={() => setView("home")}
            className="mb-6 text-text-muted dark:text-dark-text-muted hover:text-text-primary dark:hover:text-dark-text-primary transition-colors"
          >
            ← Back
          </button>

          <h1 className="text-3xl font-semibold mb-2 text-text-primary dark:text-dark-text-primary">Join Party</h1>
          <p className="text-text-muted dark:text-dark-text-muted mb-8">Enter the party code to join</p>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2 text-text-primary dark:text-dark-text-primary">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="input"
                maxLength={20}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-text-primary dark:text-dark-text-primary">Party Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                className="input text-2xl font-mono text-center uppercase tracking-wider"
                maxLength={6}
              />
            </div>

            <button
              onClick={handleJoinParty}
              disabled={isLoading}
              className={isLoading ? "btn-disabled w-full mt-2" : "btn-primary w-full mt-2"}
            >
              {isLoading ? "Joining..." : "Join Party"}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Home view
  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8 relative">
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <ConcentricCircles />
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="text-center max-w-2xl relative z-10"
      >
        <motion.div
          animate={{
            scale: [1, 1.02, 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="text-7xl md:text-8xl mb-6"
        >
          🎵
        </motion.div>

        <h1 className="text-5xl md:text-6xl font-semibold mb-4 text-text-primary dark:text-dark-text-primary">
          Nero Party
        </h1>
        <p className="text-lg md:text-xl text-text-muted dark:text-dark-text-muted mb-12 max-w-md mx-auto">
          Create a listening party and vibe with friends
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setView("create")}
            className="btn-secondary px-8 py-3.5 text-base"
          >
            Create Party
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setView("join")}
            className="btn-primary px-8 py-3.5 text-base"
          >
            Join Party
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

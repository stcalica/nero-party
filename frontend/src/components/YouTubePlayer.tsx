import { useRef, useEffect, useState } from "react";
import YouTube, { YouTubeProps } from "react-youtube";
import { socket } from "../lib/socket";

const SYNC_THRESHOLD = 3; // seconds of acceptable drift

// Arcade-style hype messages shown every 10 seconds (after 15s delay)
const ARCADE_MESSAGES = [
  "🔥 ON FIRE! 🔥",
  "⚡ EPIC! ⚡",
  "🌟 LEGENDARY! 🌟",
  "💎 VIBING! 💎",
  "🎸 ROCK ON! 🎸",
  "✨ STELLAR! ✨",
  "🚀 LIT! 🚀",
];

interface Props {
  videoId: string;
  partyCode: string;
  startPosition?: number;
  serverTimestamp?: number;
}

export default function YouTubePlayer({
  videoId,
  partyCode,
  startPosition = 0,
  serverTimestamp,
}: Props) {
  const playerRef = useRef<any>(null);
  const [showArcadeText, setShowArcadeText] = useState(false);
  const [arcadeMessage, setArcadeMessage] = useState("");

  // Calculate current position based on server timestamp
  const getCurrentPosition = () => {
    if (!serverTimestamp) return startPosition;
    const elapsedMs = Date.now() - serverTimestamp;
    return startPosition + elapsedMs / 1000;
  };

  const opts: YouTubeProps["opts"] = {
    height: "450",
    width: "100%",
    playerVars: {
      autoplay: 1,
      controls: 0, // Disable controls so no one (including host) can pause/skip
      modestbranding: 1,
      rel: 0,
      disablekb: 1, // Disable keyboard controls
    },
  };

  const onReady: YouTubeProps["onReady"] = (event) => {
    playerRef.current = event.target;

    // Seek to correct position when ready
    const targetPosition = getCurrentPosition();
    if (targetPosition > 0) {
      event.target.seekTo(targetPosition, true);
    }
  };

  const onEnd: YouTubeProps["onEnd"] = () => {
    // Notify server that song ended
    socket.emit("song:next", partyCode);
  };

  const onError: YouTubeProps["onError"] = (event) => {
    console.error("YouTube player error:", event);
    // Auto-skip on error
    setTimeout(() => {
      socket.emit("song:next", partyCode);
    }, 2000);
  };

  // Listen for playback control events
  useEffect(() => {
    console.log("🎬 [YouTubePlayer MOUNT] Component mounted/updated");
    console.log("📺 [LISTENER SETUP] Setting up playback event listeners");
    console.log(`📺 [LISTENER SETUP] Video ID: ${videoId}`);
    console.log(`📺 [LISTENER SETUP] Party code: ${partyCode}`);
    console.log(`📺 [LISTENER SETUP] Socket ID: ${socket.id}`);
    console.log(`📺 [LISTENER SETUP] Socket connected: ${socket.connected}`);
    console.log(`📺 [LISTENER SETUP] Timestamp: ${new Date().toISOString()}`);

    const handleSync = (data: {
      songId: string;
      currentTime: number;
      serverTimestamp: number;
    }) => {
      console.log(`📡 [RECEIVED] playback:sync event at ${new Date().toISOString()}:`, data);

      if (!playerRef.current) {
        console.warn("playback:sync received but player not ready");
        return;
      }

      try {
        const player = playerRef.current;

        // Get current player time (synchronous call)
        const currentPlayerTime = player.getCurrentTime();
        const targetTime =
          data.currentTime + (Date.now() - data.serverTimestamp) / 1000;

        const drift = Math.abs(currentPlayerTime - targetTime);

        // Only sync if drift exceeds threshold
        if (drift > SYNC_THRESHOLD) {
          console.log(`Syncing: drift of ${drift.toFixed(2)}s`);
          player.seekTo(targetTime, true);
        }
      } catch (error) {
        // getCurrentTime might fail if player not ready
        console.warn("Could not get current time:", error);
      }
    };

    const handleSkip = (data?: { songId: string; reason: string }) => {
      console.log(`📡 [RECEIVED] playback:skip event at ${new Date().toISOString()}:`, data);
      console.log(`⏭️ PLAYBACK SKIP EVENT RECEIVED:`, data);
      console.log(`   Party code: ${partyCode}`);
      console.log(`   Player ready: ${!!playerRef.current}`);
      console.log(`   Emitting song:next to backend...`);

      // Emit song:next to advance to next track
      socket.emit("song:next", partyCode);
      console.log(`   ✅ song:next emitted`);
    };

    const handleSeek = (data: { songId: string; seekTo: number; reason: string }) => {
      console.log(`📡 [RECEIVED] playback:seek event at ${new Date().toISOString()}:`, data);
      console.log(`⏩ PLAYBACK SEEK EVENT RECEIVED:`, data);
      console.log(`   Seeking to: ${data.seekTo}s`);
      console.log(`   Player ready: ${!!playerRef.current}`);

      if (!playerRef.current) {
        console.error("❌ Cannot seek: player not ready");
        return;
      }

      try {
        const player = playerRef.current;
        const currentTime = player.getCurrentTime();
        console.log(`   Current time: ${currentTime}s`);

        // Seek to the specified time
        player.seekTo(data.seekTo, true);
        console.log(`✅ Successfully called seekTo(${data.seekTo})`);

        // Verify seek happened
        setTimeout(() => {
          const newTime = player.getCurrentTime();
          console.log(`   New time after seek: ${newTime}s`);
        }, 100);
      } catch (error) {
        console.error("❌ Error seeking player:", error);
      }
    };

    socket.on("playback:sync", handleSync);
    socket.on("playback:skip", handleSkip);
    socket.on("playback:seek", handleSeek);

    console.log("✅ YouTubePlayer: Event listeners registered");
    console.log(`✅ Listeners active for party: ${partyCode}`);
    console.log(`✅ Socket ${socket.id} is listening for: playback:sync, playback:skip, playback:seek`);

    return () => {
      console.log("🔌 [YouTubePlayer UNMOUNT/CLEANUP] Removing event listeners");
      console.log(`🔌 Party code: ${partyCode}`);
      console.log(`🔌 Socket ID: ${socket.id}`);
      console.log(`🔌 Timestamp: ${new Date().toISOString()}`);
      socket.off("playback:sync", handleSync);
      socket.off("playback:skip", handleSkip);
      socket.off("playback:seek", handleSeek);
      console.log("🔌 Listeners removed");
    };
  }, [partyCode]);

  // Arcade-style visual feedback every 10 seconds (starts after 15 seconds)
  // Safe: Purely cosmetic, doesn't affect playback or scoring
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const showArcadeFlash = () => {
      // Pick a random message
      const message = ARCADE_MESSAGES[Math.floor(Math.random() * ARCADE_MESSAGES.length)];
      setArcadeMessage(message);
      setShowArcadeText(true);

      // Hide after 2 seconds
      setTimeout(() => {
        setShowArcadeText(false);
      }, 2000);
    };

    // Wait 15 seconds before showing first message
    const initialTimeout = setTimeout(() => {
      showArcadeFlash();

      // Then show every 10 seconds after that
      interval = setInterval(showArcadeFlash, 10000);
    }, 15000);

    return () => {
      clearTimeout(initialTimeout);
      if (interval) clearInterval(interval);
    };
  }, [videoId]); // Reset when video changes

  return (
    <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
      <div className="absolute inset-0">
        <YouTube
          videoId={videoId}
          opts={opts}
          onReady={onReady}
          onEnd={onEnd}
          onError={onError}
          className="w-full h-full"
        />
        {/* Overlay to prevent any clicks on the video player */}
        <div
          className="absolute inset-0 z-50"
          style={{
            cursor: 'not-allowed',
            pointerEvents: 'all',
            background: 'transparent'
          }}
          onClick={(e) => e.preventDefault()}
          onMouseDown={(e) => e.preventDefault()}
        >
          {/* Arcade-style visual feedback */}
          {showArcadeText && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                animation: 'arcadePulse 0.5s ease-in-out infinite',
                pointerEvents: 'none',
              }}
            >
              <div
                className="text-6xl md:text-8xl font-black tracking-wider"
                style={{
                  color: '#FFD700',
                  textShadow: `
                    0 0 10px rgba(255, 215, 0, 0.8),
                    0 0 20px rgba(255, 215, 0, 0.6),
                    0 0 30px rgba(255, 69, 0, 0.8),
                    3px 3px 0px rgba(0, 0, 0, 0.8),
                    6px 6px 0px rgba(0, 0, 0, 0.5)
                  `,
                  WebkitTextStroke: '2px #000',
                  fontFamily: '"Impact", "Arial Black", sans-serif',
                  letterSpacing: '0.1em',
                  transform: 'rotate(-5deg)',
                }}
              >
                {arcadeMessage}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

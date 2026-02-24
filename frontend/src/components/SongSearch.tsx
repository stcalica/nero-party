import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { socket } from "../lib/socket";
import { toast } from "sonner";
import type { YouTubeSearchResult } from "../types";

interface Props {
  partyCode: string;
}

export default function SongSearch({ partyCode }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<YouTubeSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error("Please enter a search query");
      return;
    }

    setIsSearching(true);

    try {
      const response = await fetch(
        `http://localhost:3000/api/youtube/search?q=${encodeURIComponent(query)}`
      );

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data = await response.json();
      setResults(data.items || []);

      if (data.items.length === 0) {
        toast.info("No results found");
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Failed to search. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddSong = async (video: YouTubeSearchResult) => {
    setIsAdding(video.id.videoId);

    try {
      // Fetch video details to get duration
      const response = await fetch(
        `http://localhost:3000/api/youtube/video/${video.id.videoId}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch video details");
      }

      const videoData = await response.json();
      const duration = videoData.duration || 0; // Duration in seconds

      socket.emit(
        "song:add",
        {
          partyCode,
          song: {
            youtubeId: video.id.videoId,
            title: video.snippet.title,
            artist: video.snippet.channelTitle,
            thumbnail: video.snippet.thumbnails.medium.url,
            duration,
          },
        },
        (response: any) => {
          setIsAdding(null);

          if (response.success) {
            toast.success("Song added to queue!");
            // Don't clear results, let user add multiple
          } else {
            toast.error(response.error || "Failed to add song");
          }
        }
      );
    } catch (error) {
      console.error("Error adding song:", error);
      toast.error("Failed to add song. Please try again.");
      setIsAdding(null);
    }
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search for songs..."
          className="flex-1 glass rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <button
          onClick={handleSearch}
          disabled={isSearching}
          className="bg-primary-600 hover:bg-primary-500 rounded-xl px-6 py-3 font-medium transition disabled:opacity-50"
        >
          {isSearching ? "Searching..." : "Search"}
        </button>
      </div>

      <AnimatePresence>
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 max-h-96 overflow-y-auto"
          >
            {results.map((video) => (
              <motion.div
                key={video.id.videoId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-hover rounded-lg p-3 flex items-center gap-3"
              >
                <img
                  src={video.snippet.thumbnails.medium.url}
                  alt={video.snippet.title}
                  className="w-20 h-14 object-cover rounded-lg"
                />

                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{video.snippet.title}</h3>
                  <p className="text-sm text-text-muted truncate">
                    {video.snippet.channelTitle}
                  </p>
                </div>

                <button
                  onClick={() => handleAddSong(video)}
                  disabled={isAdding === video.id.videoId}
                  className="bg-primary-600 hover:bg-primary-500 rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 whitespace-nowrap"
                >
                  {isAdding === video.id.videoId ? "Adding..." : "Add"}
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

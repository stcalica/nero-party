import { motion } from "framer-motion";
import { useState } from "react";
import { socket } from "../lib/socket";
import { toast } from "sonner";
import Modal from "./Modal";

interface Props {
  partyCode: string;
}

export default function HostControls({ partyCode }: Props) {
  const [skipSongModal, setSkipSongModal] = useState(false);

  const handleSkipSong = () => {
    socket.emit("song:skip", { partyCode });
    toast.info("Skipping to next song...");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-4 flex items-center justify-between"
    >
      <div>
        <p className="font-semibold text-sm">Host Controls</p>
        <p className="text-xs text-text-muted">Manage the party</p>
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setSkipSongModal(true)}
        className="btn-primary text-sm px-4 py-2"
      >
        Skip Song
      </motion.button>

      <Modal
        isOpen={skipSongModal}
        onClose={() => setSkipSongModal(false)}
        onConfirm={handleSkipSong}
        title="Skip Song"
        message="Are you sure you want to skip to the next song? This will immediately end the current song for all participants."
        confirmText="Skip"
        cancelText="Cancel"
        type="confirm"
      />
    </motion.div>
  );
}

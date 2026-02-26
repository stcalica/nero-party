import { motion } from "framer-motion";
import { useState } from "react";
import { socket } from "../lib/socket";
import { toast } from "sonner";
import type { Participant } from "../types";
import Modal from "./Modal";

interface ParticipantListProps {
  participants: Participant[];
  currentUserId?: string;
  isHost?: boolean;
  partyCode?: string;
  birthdayUserId?: string | null;
  isBirthdayTheme?: boolean;
  showBirthdaySelector?: boolean; // Only true in lobby
}

export default function ParticipantList({
  participants,
  currentUserId,
  isHost = false,
  partyCode,
  birthdayUserId = null,
  isBirthdayTheme = false,
  showBirthdaySelector = false,
}: ParticipantListProps) {
  const [kickModal, setKickModal] = useState<{
    isOpen: boolean;
    participantId?: string;
    participantName?: string;
  }>({ isOpen: false });

  const handleKickClick = (participantId: string, participantName: string) => {
    setKickModal({ isOpen: true, participantId, participantName });
  };

  const handleConfirmKick = () => {
    if (kickModal.participantId && kickModal.participantName) {
      socket.emit("participant:kick", { partyCode, participantId: kickModal.participantId });
      toast.info(`${kickModal.participantName} has been kicked`);
    }
  };

  const handleToggleBirthday = (participantId: string) => {
    const newBirthdayUserId = birthdayUserId === participantId ? null : participantId;
    socket.emit("party:setBirthdayUser", {
      partyCode,
      userId: newBirthdayUserId,
    });
    const participant = participants.find(p => p.id === participantId);
    if (newBirthdayUserId) {
      toast.success(`🎂 ${participant?.name} is the birthday person!`);
    } else {
      toast.info(`Removed birthday person status`);
    }
  };

  return (
    <div className="glass rounded-2xl p-6">
      <h2 className="text-xl font-bold mb-4">
        Participants ({participants.length})
      </h2>

      <div className="space-y-2">
        {participants.map((participant, index) => (
          <motion.div
            key={participant.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="glass-hover rounded-lg p-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-2 h-2 rounded-full ${
                  participant.socketId ? "bg-accent" : "bg-text-muted"
                }`}
              />
              <span className="font-medium">
                {participant.name}
                {/* Show birthday cake emoji ONLY for the birthday person, and only when not in selector mode */}
                {birthdayUserId === participant.id && !showBirthdaySelector && <span className="ml-2">🎂</span>}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {participant.isHost && (
                <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded-full">
                  Host
                </span>
              )}

              {/* Birthday selector button - ONLY show in lobby when showBirthdaySelector is true */}
              {isHost && showBirthdaySelector && isBirthdayTheme && (
                <motion.button
                  key={`birthday-${participant.id}-${birthdayUserId === participant.id}`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleToggleBirthday(participant.id)}
                  className="text-2xl"
                  style={{
                    opacity: birthdayUserId === participant.id ? 1 : 0.3,
                    filter: birthdayUserId === participant.id ? "none" : "grayscale(100%)",
                    transition: "all 0.2s ease",
                  }}
                  title={birthdayUserId === participant.id ? "Remove birthday person" : "Set as birthday person"}
                >
                  🎂
                </motion.button>
              )}

              {isHost && !participant.isHost && participant.id !== currentUserId && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleKickClick(participant.id, participant.name)}
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-500 hover:text-red-400 dark:text-red-400 dark:hover:text-red-300 text-xs px-3 py-1.5 rounded-lg transition font-medium"
                  title="Kick participant"
                >
                  Kick
                </motion.button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <Modal
        isOpen={kickModal.isOpen}
        onClose={() => setKickModal({ isOpen: false })}
        onConfirm={handleConfirmKick}
        title="Kick Participant"
        message={`Are you sure you want to kick ${kickModal.participantName} from the party? They will be immediately disconnected.`}
        confirmText="Kick"
        cancelText="Cancel"
        type="confirm"
      />
    </div>
  );
}

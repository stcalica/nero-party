import { motion } from "framer-motion";
import { socket } from "../lib/socket";
import { toast } from "sonner";
import type { Party, Participant } from "../types";
import ParticipantList from "./ParticipantList";
import SongSearch from "./SongSearch";
import SongQueue from "./SongQueue";
import PartyQRCode from "./PartyQRCode";
import ConcentricCircles from "./ConcentricCircles";
import BirthdayTheme from "./BirthdayTheme";
import HipHopTheme from "./HipHopTheme";
import PunkTheme from "./PunkTheme";

interface Props {
  party: Party;
  currentUser: Participant;
}

export default function PartyLobby({ party, currentUser }: Props) {
  const handleStartParty = () => {
    if (party.songs.length === 0) {
      toast.error("Add at least one song to start the party!");
      return;
    }

    socket.emit("party:start", { partyCode: party.code });
  };

  const isHost = currentUser.isHost;
  const isEmpty = party.songs.length === 0;

  return (
    <>
      <ConcentricCircles color="dark" />
      {party.theme === "birthday" && <BirthdayTheme />}
      {party.theme === "hiphop" && <HipHopTheme />}
      {party.theme === "punk" && <PunkTheme />}
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Participants */}
        <div className="lg:col-span-1 space-y-6">
          <ParticipantList
            participants={party.participants}
            currentUserId={currentUser.id}
            isHost={currentUser.isHost}
            partyCode={party.code}
            birthdayUserId={party.birthdayUserId}
            isBirthdayTheme={party.theme === "birthday"}
            showBirthdaySelector={true}
          />

          <PartyQRCode partyCode={party.code} />

          {isHost && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStartParty}
              className={isEmpty ? "btn-disabled w-full mt-6 text-lg" : "btn-primary w-full mt-6 text-lg"}
              disabled={isEmpty}
            >
              {isEmpty ? "Add Songs to Start" : "Start Party 🎉"}
            </motion.button>
          )}

          {!isHost && (
            <div className="mt-6 glass rounded-xl p-4 text-center text-text-muted dark:text-dark-text-muted">
              <p>Waiting for host to start the party...</p>
            </div>
          )}
        </div>

        {/* Center: Song Search */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-4">Add Songs</h2>
            <SongSearch partyCode={party.code} />
          </div>

          {/* Song Queue */}
          <div className="glass rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-4">
              Queue ({party.songs.length}{party.songLimit ? `/${party.songLimit}` : ""})
            </h2>

            {isEmpty ? (
              <div className="text-center py-12 text-text-muted dark:text-dark-text-muted">
                <div className="text-6xl mb-4">🎵</div>
                <p>No songs yet. Search and add some music!</p>
              </div>
            ) : (
              <SongQueue songs={party.songs} showVotes={false} />
            )}
          </div>
        </div>
      </div>
      </div>
    </>
  );
}

import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  partyCode: string;
}

export default function PartyQRCode({ partyCode }: Props) {
  const joinUrl = `${window.location.origin}?join=${partyCode}`;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(partyCode);
      setCopied(true);
      toast.success("Party code copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy code");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass rounded-2xl p-4 md:p-6 text-center"
    >
      <h3 className="text-base md:text-lg font-bold mb-2 md:mb-3">Quick Join</h3>
      <p className="text-xs md:text-sm text-text-muted mb-3 md:mb-4">
        Scan to join the party
      </p>

      <div className="bg-white p-3 md:p-4 rounded-xl inline-block">
        <QRCodeSVG
          value={joinUrl}
          size={120}
          level="M"
          includeMargin={false}
          className="w-full h-auto max-w-[120px] md:max-w-[160px]"
        />
      </div>

      <div className="mt-3 md:mt-4">
        <p className="text-xs text-text-muted">Party Code</p>
        <div className="flex items-center justify-center gap-2 md:gap-3">
          <p className="text-xl md:text-2xl font-bold tracking-wider">{partyCode}</p>
          <button
            onClick={handleCopy}
            className="glass-hover rounded-lg p-2 transition-all hover:scale-110 active:scale-95"
            title="Copy party code"
          >
            <span className="text-xl md:text-2xl">{copied ? "✓" : "📋"}</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

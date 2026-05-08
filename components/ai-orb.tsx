"use client";

import { motion } from "framer-motion";
import { AudioLines, Brain, Mic2 } from "lucide-react";
import { cn } from "@/lib/utils";

type AIOrbProps = {
  listening?: boolean;
  compact?: boolean;
  label?: string;
};

export function AIOrb({
  listening = true,
  compact = false,
  label = "Listening across 7 channels"
}: AIOrbProps) {
  return (
    <div
      className={cn(
        "relative flex items-center gap-4",
        compact ? "gap-3" : "gap-5"
      )}
    >
      <motion.div
        animate={{ rotate: 360 }}
        className={cn(
          "relative rounded-full border border-white/15 bg-black/30 p-1 shadow-[0_0_70px_rgba(120,255,214,0.18)]",
          compact ? "h-14 w-14" : "h-24 w-24"
        )}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
      >
        <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_90deg,rgba(120,255,214,0.95),rgba(114,233,255,0.28),rgba(255,225,156,0.75),rgba(255,142,182,0.38),rgba(120,255,214,0.95))] blur-[1px]" />
        <motion.div
          animate={{ scale: listening ? [0.92, 1.04, 0.92] : 1 }}
          className="absolute inset-2 rounded-full bg-[#080807] shadow-inner shadow-black"
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          {listening ? (
            <Mic2 className={cn("text-calm-mint", compact ? "h-5 w-5" : "h-8 w-8")} />
          ) : (
            <Brain className={cn("text-calm-cyan", compact ? "h-5 w-5" : "h-8 w-8")} />
          )}
        </div>
      </motion.div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-calm-mint">
          <AudioLines className="h-3.5 w-3.5" />
          AI Voice
        </div>
        <p
          className={cn(
            "mt-1 truncate font-display font-semibold text-white",
            compact ? "max-w-36 text-sm" : "max-w-64 text-xl"
          )}
        >
          {label}
        </p>
      </div>
    </div>
  );
}

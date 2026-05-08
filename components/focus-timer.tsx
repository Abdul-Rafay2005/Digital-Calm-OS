"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Pause, Play, RotateCcw, TimerReset } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const FOCUS_SECONDS = 50 * 60;

export function FocusTimer() {
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_SECONDS);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!active) return;

    const interval = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          return FOCUS_SECONDS;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [active]);

  const progress = useMemo(
    () => ((FOCUS_SECONDS - secondsLeft) / FOCUS_SECONDS) * 100,
    [secondsLeft]
  );

  const minutes = Math.floor(secondsLeft / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (secondsLeft % 60).toString().padStart(2, "0");

  return (
    <div className="quiet-card relative overflow-hidden rounded-2xl p-5">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-calm-mint/60 to-transparent" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-white/45">
            <TimerReset className="h-3.5 w-3.5 text-calm-mint" />
            Focus Mode
          </div>
          <p className="mt-2 text-sm leading-6 text-white/62">
            Low-signal platforms stay quiet until this block completes.
          </p>
        </div>
        <motion.div
          animate={{ opacity: active ? [0.7, 1, 0.7] : 0.6 }}
          className="rounded-full border border-calm-mint/20 bg-calm-mint/10 px-3 py-1 text-xs text-calm-mint"
          transition={{ duration: 2.5, repeat: Infinity }}
        >
          {active ? "Protected" : "Ready"}
        </motion.div>
      </div>

      <div className="mt-7 flex items-end justify-between gap-4">
        <div className="font-display text-5xl font-semibold tracking-normal text-white">
          {minutes}:{seconds}
        </div>
        <div className="flex gap-2">
          <Button
            aria-label={active ? "Pause focus timer" : "Start focus timer"}
            onClick={() => setActive((value) => !value)}
            size="icon"
            variant="signal"
          >
            {active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button
            aria-label="Reset focus timer"
            onClick={() => {
              setSecondsLeft(FOCUS_SECONDS);
              setActive(false);
            }}
            size="icon"
            variant="calm"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <Progress className="mt-5" value={progress} tone="mint" />
    </div>
  );
}

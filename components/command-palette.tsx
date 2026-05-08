"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Brain,
  CalendarClock,
  Check,
  Clock3,
  Command,
  Focus,
  Inbox,
  Search,
  Sparkles,
  Volume2,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CommandItem = {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  action: () => void;
};

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFocusMode: () => void;
  onAssistant: () => void;
  onThemeShift: () => void;
};

export function CommandPalette({
  open,
  onOpenChange,
  onFocusMode,
  onAssistant,
  onThemeShift
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const commands = useMemo<CommandItem[]>(
    () => [
      {
        id: "integrations",
        label: "Connection setup",
        description: "Connect Gmail, Google Calendar, and Google Tasks",
        icon: Sparkles,
        shortcut: "C",
        action: () => {
          window.location.href = "/connect";
          onOpenChange(false);
        }
      },
      {
        id: "priority",
        label: "Open priority inbox",
        description: "Jump to what actually matters today",
        icon: Inbox,
        shortcut: "I",
        action: () => scrollToSection("inbox", onOpenChange)
      },
      {
        id: "focus",
        label: "Start focus mode",
        description: "Hide low-priority channels and protect a deep-work block",
        icon: Focus,
        shortcut: "F",
        action: () => {
          onFocusMode();
          onOpenChange(false);
        }
      },
      {
        id: "briefing",
        label: "Read daily AI briefing",
        description: "Summarize meetings, messages, and deadlines",
        icon: Sparkles,
        shortcut: "B",
        action: () => scrollToSection("briefing", onOpenChange)
      },
      {
        id: "assistant",
        label: "Ask Calm Assistant",
        description: "Open the AI action center and voice assistant",
        icon: Brain,
        shortcut: "A",
        action: () => {
          onAssistant();
          onOpenChange(false);
        }
      },
      {
        id: "calendar",
        label: "Show load heatmap",
        description: "Inspect calendar pressure and mental load",
        icon: CalendarClock,
        shortcut: "H",
        action: () => scrollToSection("analytics", onOpenChange)
      },
      {
        id: "voice",
        label: "Start voice triage",
        description: "Dictate decisions while Calm OS handles routing",
        icon: Volume2,
        shortcut: "V",
        action: () => {
          onAssistant();
          onOpenChange(false);
        }
      },
      {
        id: "theme",
        label: "Shift workspace mood",
        description: "Adapt the interface toward lower visual stimulation",
        icon: Clock3,
        shortcut: "M",
        action: () => {
          onThemeShift();
          onOpenChange(false);
        }
      }
    ],
    [onAssistant, onFocusMode, onOpenChange, onThemeShift]
  );

  const filtered = commands.filter((commandItem) => {
    const value = `${commandItem.label} ${commandItem.description}`.toLowerCase();
    return value.includes(query.toLowerCase());
  });

  useEffect(() => {
    if (!open) return;

    const reset = window.setTimeout(() => {
      setSelected(0);
      setQuery("");
      inputRef.current?.focus();
    }, 40);

    return () => window.clearTimeout(reset);
  }, [open]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
      }

      if (!open) return;

      if (event.key === "Escape") {
        onOpenChange(false);
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelected((value) => Math.min(value + 1, filtered.length - 1));
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelected((value) => Math.max(value - 1, 0));
      }

      if (event.key === "Enter") {
        event.preventDefault();
        filtered[selected]?.action();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [filtered, onOpenChange, open, selected]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/62 px-4 pt-[12vh] backdrop-blur-xl"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onMouseDown={() => onOpenChange(false)}
        >
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="glass-panel w-full max-w-2xl overflow-hidden rounded-[2rem]"
            exit={{ opacity: 0, scale: 0.96, y: 14 }}
            initial={{ opacity: 0, scale: 0.96, y: 14 }}
            onMouseDown={(event) => event.stopPropagation()}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
              <Search className="h-5 w-5 text-white/45" />
              <input
                ref={inputRef}
                aria-label="Search commands"
                className="h-10 flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/35"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search calm actions, inbox, focus, summaries..."
                value={query}
              />
              <Button aria-label="Close command palette" onClick={() => onOpenChange(false)} size="icon" variant="ghost">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="max-h-[54vh] overflow-y-auto p-3">
              {filtered.length ? (
                filtered.map((commandItem, index) => {
                  const Icon = commandItem.icon;
                  const active = index === selected;

                  return (
                    <button
                      className={cn(
                        "group flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-left transition-all",
                        active
                          ? "bg-white/[0.1] text-white shadow-inner shadow-white/[0.03]"
                          : "text-white/72 hover:bg-white/[0.06] hover:text-white"
                      )}
                      key={commandItem.id}
                      onMouseEnter={() => setSelected(index)}
                      onClick={commandItem.action}
                    >
                      <span
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-xl border transition-colors",
                          active
                            ? "border-calm-mint/25 bg-calm-mint/10 text-calm-mint"
                            : "border-white/10 bg-white/[0.04] text-white/45"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{commandItem.label}</span>
                        <span className="mt-0.5 block truncate text-sm text-white/48">
                          {commandItem.description}
                        </span>
                      </span>
                      {commandItem.shortcut ? (
                        <kbd className="rounded-lg border border-white/10 bg-white/[0.05] px-2 py-1 text-xs text-white/45">
                          {commandItem.shortcut}
                        </kbd>
                      ) : null}
                      {active ? <ArrowRight className="h-4 w-4 text-calm-mint" /> : null}
                    </button>
                  );
                })
              ) : (
                <div className="px-5 py-10 text-center text-sm text-white/45">
                  No matching calm command.
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-white/10 px-5 py-3 text-xs text-white/42">
              <span className="flex items-center gap-2">
                <Command className="h-3.5 w-3.5" />
                Ctrl K
              </span>
              <span className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-calm-mint" />
                Keyboard-first command center
              </span>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function scrollToSection(sectionId: string, onOpenChange: (open: boolean) => void) {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  onOpenChange(false);
}

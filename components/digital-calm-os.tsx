"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Brain,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDotDashed,
  Command,
  Cpu,
  EyeOff,
  FileText,
  Gauge,
  Grid2X2,
  Headphones,
  Inbox,
  Layers3,
  ListChecks,
  Mail,
  Menu,
  MessageCircle,
  MessageSquare,
  Mic2,
  Moon,
  PanelRightOpen,
  Send,
  ShieldCheck,
  Sparkles,
  TimerReset,
  Unplug,
  WandSparkles,
  Waves,
  X,
  Zap
} from "lucide-react";
import { AmbientBackground } from "@/components/ambient-background";
import { AIOrb } from "@/components/ai-orb";
import { LoadAreaChart, PlatformBarChart } from "@/components/analytics-charts";
import { CommandPalette } from "@/components/command-palette";
import { FocusTimer } from "@/components/focus-timer";
import { IntegrationsPanel } from "@/components/integrations-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  dailySummary,
  filterCategories,
  focusRecommendations,
  liveFeed,
  loadAnalytics,
  mentalLoadHeatmap,
  suggestedActions,
  testimonials,
  type Platform,
  type PriorityItem
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type Mood = "signal" | "deep" | "ambient";

const platformIcons: Record<Platform, LucideIcon> = {
  Gmail: Mail,
  Slack: MessageSquare,
  Discord: MessageCircle,
  WhatsApp: Send,
  Calendar: CalendarDays,
  Notion: FileText,
  Tasks: ListChecks,
  Trello: ListChecks
};

const platformAccent: Record<Platform, string> = {
  Gmail: "text-calm-mint",
  Slack: "text-calm-cyan",
  Discord: "text-calm-violet",
  WhatsApp: "text-calm-rose",
  Calendar: "text-calm-amber",
  Notion: "text-white",
  Tasks: "text-calm-cyan",
  Trello: "text-calm-cyan"
};

const categoryVariant = {
  urgent: "rose",
  "deep work": "mint",
  noise: "default",
  social: "violet",
  deadlines: "amber",
  finance: "cyan",
  team: "cyan"
} as const;

const actionTone = {
  mint: "border-calm-mint/20 bg-calm-mint/10 text-calm-mint",
  cyan: "border-calm-cyan/20 bg-calm-cyan/10 text-calm-cyan",
  amber: "border-calm-amber/20 bg-calm-amber/10 text-calm-amber",
  violet: "border-calm-violet/20 bg-calm-violet/10 text-calm-violet"
} as const;

const moodCopy: Record<Mood, string> = {
  signal: "Signal-rich",
  deep: "Deep work",
  ambient: "Ambient calm"
};

export function DigitalCalmOS() {
  const [commandOpen, setCommandOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [feedIndex, setFeedIndex] = useState(0);
  const [mood, setMood] = useState<Mood>("signal");
  const [greeting] = useState(getGreeting);
  const [typedMessage, setTypedMessage] = useState("");
  const [syncedSignals, setSyncedSignals] = useState<PriorityItem[]>([]);

  const focusInbox = useMemo(
    () =>
      syncedSignals.filter((item) =>
        focusMode ? item.priority >= 70 : true
      ),
    [focusMode, syncedSignals]
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      setFeedIndex((index) => (index + 1) % liveFeed.length);
    }, 2800);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const message =
      "I found 3 decisions, 2 commitments, and 167 pieces of noise. Your next calm action is ready.";
    let index = 0;
    const reset = window.setTimeout(() => setTypedMessage(""), 0);

    const interval = window.setInterval(() => {
      index += 1;
      setTypedMessage(message.slice(0, index));
      if (index >= message.length) window.clearInterval(interval);
    }, assistantOpen ? 24 : 120);

    return () => {
      window.clearTimeout(reset);
      window.clearInterval(interval);
    };
  }, [assistantOpen, feedIndex]);

  const shiftMood = () => {
    setMood((current) => {
      if (current === "signal") return "deep";
      if (current === "deep") return "ambient";
      return "signal";
    });
  };

  return (
    <div
      className={cn(
        "relative min-h-screen overflow-hidden text-white",
        mood === "deep" && "bg-[radial-gradient(circle_at_50%_0%,rgba(120,255,214,0.08),transparent_34rem)]",
        mood === "ambient" && "bg-[radial-gradient(circle_at_50%_0%,rgba(255,225,156,0.08),transparent_34rem)]"
      )}
    >
      <AmbientBackground />
      <div className="calm-grid fixed inset-0 z-0 opacity-45" aria-hidden="true" />
      <div
        className={cn(
          "pointer-events-none fixed inset-0 z-0 transition-opacity duration-700",
          focusMode ? "bg-black/36 opacity-100" : "opacity-0"
        )}
      />

      <SiteHeader
        commandOpen={() => setCommandOpen(true)}
        focusMode={focusMode}
        mobileNavOpen={mobileNavOpen}
        setMobileNavOpen={setMobileNavOpen}
      />

      <main className="relative z-10">
        <HeroSection
          commandOpen={() => setCommandOpen(true)}
          focusMode={focusMode}
          greeting={greeting}
          liveSignal={liveFeed[feedIndex]}
          mood={mood}
          priorityItems={focusInbox}
          setAssistantOpen={setAssistantOpen}
          setFocusMode={setFocusMode}
        />

        <ProblemSection />
        <IntegrationsPanel
          onSignalsSynced={(signals) =>
            setSyncedSignals((current) => [
              ...signals.filter(
                (signal) => !current.some((item) => item.id === signal.id)
              ),
              ...current
            ])
          }
        />

        <section
          className="mx-auto grid max-w-7xl gap-5 px-4 py-16 sm:px-6 lg:grid-cols-[1.18fr_0.82fr] lg:px-8"
          id="inbox"
        >
          <PriorityInbox items={focusInbox} focusMode={focusMode} />
          <div className="space-y-5">
            <DailyBriefing />
            <SmartFilters focusMode={focusMode} setFocusMode={setFocusMode} />
          </div>
        </section>

        <section
          className="mx-auto grid max-w-7xl gap-5 px-4 py-10 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:px-8"
          id="briefing"
        >
          <ActionCenter setAssistantOpen={setAssistantOpen} />
          <FocusSystem mood={mood} setMood={setMood} />
        </section>

        <AnalyticsSection />
        <AIVizSection />
        <FeatureSection />
        <OnboardingSection />
        <TestimonialsSection />
        <CTASection commandOpen={() => setCommandOpen(true)} />
      </main>

      <AssistantDock
        assistantOpen={assistantOpen}
        close={() => setAssistantOpen(false)}
        liveSignal={liveFeed[feedIndex]}
        open={() => setAssistantOpen(true)}
        typedMessage={typedMessage}
      />

      <CommandPalette
        onAssistant={() => setAssistantOpen(true)}
        onFocusMode={() => setFocusMode((value) => !value)}
        onOpenChange={setCommandOpen}
        onThemeShift={shiftMood}
        open={commandOpen}
      />
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function SiteHeader({
  commandOpen,
  focusMode,
  mobileNavOpen,
  setMobileNavOpen
}: {
  commandOpen: () => void;
  focusMode: boolean;
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
}) {
  const links = [
    ["Integrations", "#integrations"],
    ["Inbox", "#inbox"],
    ["Analytics", "#analytics"],
    ["AI OS", "#ai-visualization"],
    ["Features", "#features"]
  ];

  return (
    <header className="fixed left-0 right-0 top-0 z-40 border-b border-white/8 bg-black/30 backdrop-blur-2xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a className="flex items-center gap-3" href="#">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-calm-mint/25 bg-calm-mint/10 text-calm-mint shadow-[0_0_24px_rgba(120,255,214,0.12)]">
            <BrainCircuit className="h-5 w-5" />
          </span>
          <span className="font-display text-sm font-semibold tracking-normal">
            Digital Calm OS
          </span>
        </a>

        <div className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1 md:flex">
          {links.map(([label, href]) => (
            <a
              className="rounded-full px-4 py-2 text-sm text-white/58 transition hover:bg-white/[0.07] hover:text-white"
              href={href}
              key={label}
            >
              {label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Badge variant={focusMode ? "mint" : "default"}>
            <CircleDotDashed className="h-3 w-3" />
            {focusMode ? "Focus protected" : "Live sync"}
          </Badge>
          <Button onClick={commandOpen} variant="calm">
            <Command className="h-4 w-4" />
            Command
            <kbd className="rounded-md border border-white/10 bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-white/45">
              Ctrl K
            </kbd>
          </Button>
        </div>

        <Button
          aria-label="Open navigation"
          className="md:hidden"
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          size="icon"
          variant="calm"
        >
          {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </nav>
      {mobileNavOpen ? (
        <div className="border-t border-white/10 bg-black/72 px-4 py-4 backdrop-blur-2xl md:hidden">
          <div className="grid gap-2">
            {links.map(([label, href]) => (
              <a
                className="rounded-2xl px-4 py-3 text-sm text-white/68 hover:bg-white/[0.07]"
                href={href}
                key={label}
                onClick={() => setMobileNavOpen(false)}
              >
                {label}
              </a>
            ))}
            <Button className="mt-2 w-full" onClick={commandOpen} variant="signal">
              <Command className="h-4 w-4" />
              Open command center
            </Button>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function HeroSection({
  commandOpen,
  focusMode,
  greeting,
  liveSignal,
  mood,
  priorityItems,
  setAssistantOpen,
  setFocusMode
}: {
  commandOpen: () => void;
  focusMode: boolean;
  greeting: string;
  liveSignal: string;
  mood: Mood;
  priorityItems: PriorityItem[];
  setAssistantOpen: (open: boolean) => void;
  setFocusMode: (value: boolean) => void;
}) {
  return (
    <section className="relative flex min-h-[102svh] flex-col overflow-hidden px-4 pb-12 pt-24 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-16 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-between">
        <div className="mx-auto max-w-5xl text-center">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mb-5 flex w-fit items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-3 py-2 text-xs font-medium text-white/70 backdrop-blur-xl"
            initial={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.5 }}
          >
            <Sparkles className="h-3.5 w-3.5 text-calm-mint" />
            {greeting}. Your AI has already reduced today&apos;s noise by 71%.
          </motion.div>
          <motion.h1
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-5xl font-semibold leading-[0.94] tracking-normal text-white sm:text-7xl lg:text-8xl"
            initial={{ opacity: 0, y: 20 }}
            transition={{ delay: 0.06, duration: 0.6 }}
          >
            Digital Calm OS
          </motion.h1>
          <motion.p
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mt-6 max-w-3xl text-balance text-base leading-8 text-white/66 sm:text-lg"
            initial={{ opacity: 0, y: 20 }}
            transition={{ delay: 0.14, duration: 0.6 }}
          >
            An AI operating layer that listens across every app, compresses the chaos,
            and shows only the decisions, commitments, and moments that matter now.
          </motion.p>
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
            initial={{ opacity: 0, y: 20 }}
            transition={{ delay: 0.22, duration: 0.6 }}
          >
            <Button onClick={commandOpen} size="lg">
              <Command className="h-4 w-4" />
              Open command center
            </Button>
            <Button onClick={() => setFocusMode(!focusMode)} size="lg" variant="calm">
              <TimerReset className="h-4 w-4" />
              {focusMode ? "Exit focus mode" : "Start focus mode"}
            </Button>
          </motion.div>
        </div>

        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mt-10"
          initial={{ opacity: 0, y: 28 }}
          transition={{ delay: 0.32, duration: 0.65 }}
        >
          <ProductStage
            focusMode={focusMode}
            liveSignal={liveSignal}
            mood={mood}
            priorityItems={priorityItems}
            setAssistantOpen={setAssistantOpen}
          />
        </motion.div>
      </div>
    </section>
  );
}

function ProductStage({
  focusMode,
  liveSignal,
  mood,
  priorityItems,
  setAssistantOpen
}: {
  focusMode: boolean;
  liveSignal: string;
  mood: Mood;
  priorityItems: PriorityItem[];
  setAssistantOpen: (open: boolean) => void;
}) {
  return (
    <div className="relative mx-auto max-w-7xl">
      <div className="absolute -inset-3 rounded-[2.2rem] border border-white/6 bg-white/[0.02]" />
      <div className="screen-glow glass-panel relative overflow-hidden rounded-[2rem]">
        <div className="absolute inset-0 scan-line opacity-45" aria-hidden="true" />
        <div className="grid min-h-[520px] lg:grid-cols-[82px_1fr_330px]">
          <aside className="hidden border-r border-white/10 bg-black/22 p-4 lg:block">
            <div className="flex h-full flex-col items-center justify-between">
              <div className="space-y-3">
                {[BrainCircuit, Inbox, BarChart3, TimerReset, Grid2X2].map((Icon, index) => (
                  <button
                    aria-label={`Product navigation ${index + 1}`}
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-2xl border transition",
                      index === 0
                        ? "border-calm-mint/25 bg-calm-mint/10 text-calm-mint"
                        : "border-white/8 bg-white/[0.04] text-white/40 hover:text-white"
                    )}
                    key={index}
                  >
                    <Icon className="h-5 w-5" />
                  </button>
                ))}
              </div>
              <button
                aria-label="Open AI assistant"
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-calm-cyan/20 bg-calm-cyan/10 text-calm-cyan"
                onClick={() => setAssistantOpen(true)}
              >
                <Mic2 className="h-5 w-5" />
              </button>
            </div>
          </aside>

          <div className="min-w-0 p-4 sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.22em] text-calm-mint">
                  What actually matters today
                </div>
                <h2 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">
                  {priorityItems.filter((item) => item.priority >= 70).length} live critical signals
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="mint">
                  <ShieldCheck className="h-3 w-3" />
                  {focusMode ? "Deep work active" : "Auto-priority on"}
                </Badge>
                <Badge variant="amber">
                  <Moon className="h-3 w-3" />
                  {moodCopy[mood]}
                </Badge>
              </div>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_0.88fr]">
              <div className="space-y-3">
                {priorityItems.length ? (
                  priorityItems
                    .slice(0, 4)
                    .map((item, index) => (
                      <SignalRow compact index={index} item={item} key={item.id} />
                    ))
                ) : (
                  <div className="rounded-2xl border border-white/9 bg-white/[0.045] p-5">
                    <div className="flex items-center gap-3 text-calm-mint">
                      <Unplug className="h-5 w-5" />
                      <span className="font-display text-base font-semibold">
                        Connect a source to start live sync
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-white/52">
                      Slack, Gmail, Calendar, and Tasks signals will appear here after OAuth and Sync now.
                    </p>
                  </div>
                )}
              </div>
              <div className="grid gap-4">
                <MentalLoadCard />
                <LiveActivity signal={liveSignal} />
              </div>
            </div>
          </div>

          <aside className="border-t border-white/10 bg-black/18 p-4 sm:p-6 lg:border-l lg:border-t-0">
            <AIOrb label="Triage complete" />
            <Separator className="my-6" />
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-semibold">AI action queue</h3>
                <Badge variant="cyan">Live</Badge>
              </div>
              <div className="mt-4 space-y-3">
                {suggestedActions.slice(0, 3).map((action) => (
                  <div className="rounded-2xl border border-white/9 bg-white/[0.045] p-3" key={action.action}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">{action.action}</p>
                        <p className="mt-1 text-xs leading-5 text-white/52">{action.detail}</p>
                      </div>
                      <span
                        className={cn(
                          "rounded-full border px-2 py-1 text-[11px]",
                          actionTone[action.tone]
                        )}
                      >
                        {action.confidence}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
      <div className="mx-auto mt-5 grid max-w-5xl gap-3 sm:grid-cols-3">
        <HeroMetric icon={EyeOff} label="Noise hidden" value="167" />
        <HeroMetric icon={Zap} label="Time recovered" value="2.4h" />
        <HeroMetric icon={Gauge} label="Mental load" value="31%" />
      </div>
    </div>
  );
}

function HeroMetric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="quiet-card flex items-center gap-3 rounded-2xl px-4 py-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-calm-mint">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <div className="font-display text-xl font-semibold">{value}</div>
        <div className="text-xs text-white/46">{label}</div>
      </div>
    </div>
  );
}

function ProblemSection() {
  return (
    <section className="border-y border-white/8 bg-white/[0.025] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
        <div>
          <Badge variant="amber">
            <Activity className="h-3 w-3" />
            Information overload is a product problem
          </Badge>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-normal sm:text-4xl">
            The modern workday is a stream of interrupts pretending to be progress.
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ["11", "average context switches per hour"],
            ["42%", "more decision fatigue after noisy mornings"],
            ["3.1h", "lost weekly to low-priority triage"]
          ].map(([value, label]) => (
            <div className="quiet-card rounded-2xl p-5" key={label}>
              <div className="font-display text-3xl font-semibold">{value}</div>
              <div className="mt-2 text-sm leading-6 text-white/58">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PriorityInbox({ items, focusMode }: { items: PriorityItem[]; focusMode: boolean }) {
  return (
    <Card className="overflow-hidden rounded-[1.75rem]" id="priority-inbox">
      <CardHeader className="flex flex-col gap-4 border-b border-white/10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-2xl">AI Priority Inbox</CardTitle>
          <CardDescription>
            Aggregated across Gmail, Slack, Discord, WhatsApp, Calendar, Notion, and Trello.
          </CardDescription>
        </div>
        <Badge variant={focusMode ? "mint" : "cyan"}>
          <Brain className="h-3 w-3" />
          {focusMode ? "Critical only" : "AI ranked"}
        </Badge>
      </CardHeader>
      <CardContent className="p-4 sm:p-5">
        <div className="space-y-3">
          {items.length ? (
            items.map((item, index) => (
              <SignalRow index={index} item={item} key={item.id} />
            ))
          ) : (
            <div className="rounded-2xl border border-white/9 bg-white/[0.04] p-6 text-center">
              <Inbox className="mx-auto h-8 w-8 text-calm-mint" />
              <h3 className="mt-4 font-display text-lg font-semibold">
                No live signals synced yet
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/54">
                Connect Slack, Gmail, Calendar, or Tasks, then run Sync now from the Integrations section.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SignalRow({
  compact = false,
  index,
  item
}: {
  compact?: boolean;
  index: number;
  item: PriorityItem;
}) {
  const Icon = platformIcons[item.platform];

  return (
    <motion.article
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-white/9 bg-white/[0.045] transition hover:border-white/16 hover:bg-white/[0.065]",
        compact ? "p-3" : "p-4 sm:p-5"
      )}
      initial={{ opacity: 0, y: 12 }}
      transition={{ delay: index * 0.045, duration: 0.28 }}
    >
      <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-calm-mint via-calm-cyan to-calm-amber opacity-70" />
      <div className="flex gap-4">
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/24",
            compact ? "h-10 w-10" : "h-12 w-12",
            platformAccent[item.platform]
          )}
        >
          <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={categoryVariant[item.category]}>{item.category}</Badge>
            <span className="text-xs text-white/42">{item.time}</span>
            <span className="text-xs text-white/42">{item.platform}</span>
          </div>
          <h3 className={cn("mt-2 font-display font-semibold", compact ? "text-sm" : "text-lg")}>
            {item.title}
          </h3>
          <p className={cn("mt-1 leading-6 text-white/58", compact ? "line-clamp-2 text-xs" : "text-sm")}>
            {item.summary}
          </p>
          {!compact ? (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-2 text-xs text-white/45">
                <CheckCircle2 className="h-3.5 w-3.5 text-calm-mint" />
                <span className="truncate">{item.impact}</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress className="h-1.5 w-24" value={item.priority} tone="mint" />
                <span className="text-xs font-medium text-calm-mint">{item.priority}</span>
                <Button size="sm" variant="calm">
                  {item.action}
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </motion.article>
  );
}

function DailyBriefing() {
  return (
    <Card className="rounded-[1.75rem]">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-2xl">Smart Daily Summary</CardTitle>
            <CardDescription>Morning briefing generated from email, meetings, tasks, and deadlines.</CardDescription>
          </div>
          <Sparkles className="h-6 w-6 text-calm-mint" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {dailySummary.map((summary, index) => (
          <motion.div
            className="rounded-2xl border border-white/9 bg-white/[0.045] p-4"
            initial={{ opacity: 0, x: 16 }}
            key={summary.title}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08 }}
            viewport={{ once: true }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.2em] text-calm-cyan">
                  {summary.meta}
                </div>
                <h3 className="mt-2 font-display text-base font-semibold">{summary.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/58">{summary.body}</p>
              </div>
              <span className="rounded-full border border-calm-mint/20 bg-calm-mint/10 px-2.5 py-1 text-xs text-calm-mint">
                {summary.score}
              </span>
            </div>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}

function SmartFilters({
  focusMode,
  setFocusMode
}: {
  focusMode: boolean;
  setFocusMode: (value: boolean) => void;
}) {
  return (
    <Card className="rounded-[1.75rem]">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Smart Filters</CardTitle>
          <CardDescription>AI categories that make triage visible.</CardDescription>
        </div>
        <Button onClick={() => setFocusMode(!focusMode)} size="sm" variant={focusMode ? "signal" : "calm"}>
          <EyeOff className="h-4 w-4" />
          {focusMode ? "Filtering" : "Filter noise"}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {filterCategories.map((filter) => (
            <Badge key={filter.label} variant={filter.active || focusMode ? "mint" : "default"}>
              {filter.label}
              <span className="text-white/45">{filter.count}</span>
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ActionCenter({ setAssistantOpen }: { setAssistantOpen: (open: boolean) => void }) {
  return (
    <Card className="rounded-[1.75rem]">
      <CardHeader className="border-b border-white/10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-2xl">AI Action Center</CardTitle>
            <CardDescription>Suggested next moves with confidence and impact.</CardDescription>
          </div>
          <Button onClick={() => setAssistantOpen(true)} size="icon" variant="signal">
            <PanelRightOpen className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-5">
        <div className="space-y-4">
          {suggestedActions.map((item) => (
            <div className="rounded-2xl border border-white/9 bg-white/[0.045] p-4" key={item.action}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-display text-base font-semibold">{item.action}</h3>
                  <p className="mt-1 text-sm leading-6 text-white/58">{item.detail}</p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full border px-2.5 py-1 text-xs",
                    actionTone[item.tone]
                  )}
                >
                  {item.confidence}%
                </span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {["Do it", "Later", "Explain"].map((label, index) => (
                  <Button key={label} size="sm" variant={index === 0 ? "signal" : "calm"}>
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function FocusSystem({ mood, setMood }: { mood: Mood; setMood: (mood: Mood) => void }) {
  const moods: Mood[] = ["signal", "deep", "ambient"];

  return (
    <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
      <FocusTimer />
      <Card className="rounded-[1.75rem]">
        <CardHeader>
          <CardTitle>Adaptive UI Mood</CardTitle>
          <CardDescription>The workspace lowers stimulation as cognitive pressure rises.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {moods.map((option) => (
              <button
                className={cn(
                  "rounded-2xl border px-3 py-3 text-sm transition",
                  mood === option
                    ? "border-calm-mint/30 bg-calm-mint/10 text-calm-mint"
                    : "border-white/10 bg-white/[0.04] text-white/58 hover:text-white"
                )}
                key={option}
                onClick={() => setMood(option)}
              >
                {moodCopy[option]}
              </button>
            ))}
          </div>
          <div className="mt-5 rounded-2xl border border-white/9 bg-black/20 p-4">
            <div className="flex items-center gap-3">
              <Headphones className="h-5 w-5 text-calm-amber" />
              <div>
                <p className="text-sm font-medium">Focus music linked</p>
                <p className="text-xs text-white/48">Binaural calm stream, 52 bpm, no vocals</p>
              </div>
            </div>
            <div className="mt-4 flex h-12 items-end gap-1">
              {Array.from({ length: 24 }).map((_, index) => (
                <motion.span
                  animate={{ height: [10, 28 + ((index * 7) % 18), 14] }}
                  className="w-full rounded-full bg-gradient-to-t from-calm-mint/40 to-calm-amber/70"
                  key={index}
                  transition={{ duration: 1.6 + (index % 4) * 0.2, repeat: Infinity, ease: "easeInOut" }}
                />
              ))}
            </div>
          </div>
          <div className="mt-5 space-y-2">
            {focusRecommendations.map((recommendation) => (
              <div className="flex items-center gap-3 text-sm text-white/62" key={recommendation}>
                <CheckCircle2 className="h-4 w-4 text-calm-mint" />
                {recommendation}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AnalyticsSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8" id="analytics">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="cyan">
            <BarChart3 className="h-3 w-3" />
            Cognitive Load Analytics
          </Badge>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-normal sm:text-5xl">
            See overload before it becomes burnout.
          </h2>
        </div>
        <div className="quiet-card w-full max-w-sm rounded-2xl p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/58">Productivity score</span>
            <span className="font-display text-2xl font-semibold text-calm-mint">87</span>
          </div>
          <Progress className="mt-3" value={87} tone="mint" />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.12fr_0.88fr]">
        <Card className="rounded-[1.75rem]">
          <CardHeader>
            <CardTitle>Notification Pressure vs Focus</CardTitle>
            <CardDescription>Real-time load based on urgency, channel volume, and context switching.</CardDescription>
          </CardHeader>
          <CardContent>
            <LoadAreaChart />
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem]">
          <CardHeader>
            <CardTitle>Muted Noise by Platform</CardTitle>
            <CardDescription>Calm OS filters low-value activity while keeping critical signals visible.</CardDescription>
          </CardHeader>
          <CardContent>
            <PlatformBarChart />
          </CardContent>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
        <MentalLoadHeatmap />
        <ContextSwitchingPanel />
      </div>
    </section>
  );
}

function MentalLoadHeatmap() {
  return (
    <Card className="rounded-[1.75rem]">
      <CardHeader>
        <CardTitle>Calendar Heatmap</CardTitle>
        <CardDescription>Four-week mental load forecast.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {mentalLoadHeatmap.map((value, index) => (
            <motion.div
              className="aspect-square rounded-xl border border-white/8"
              initial={{ opacity: 0, scale: 0.9 }}
              key={`${value}-${index}`}
              style={{
                background:
                  value > 75
                    ? `rgba(255, 142, 182, ${0.18 + value / 240})`
                    : value > 50
                      ? `rgba(255, 225, 156, ${0.16 + value / 260})`
                      : `rgba(120, 255, 214, ${0.12 + value / 320})`
              }}
              title={`Load ${value}`}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.01 }}
              viewport={{ once: true }}
            />
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between text-xs text-white/45">
          <span>Calm</span>
          <span>High pressure</span>
        </div>
      </CardContent>
    </Card>
  );
}

function ContextSwitchingPanel() {
  const peak = loadAnalytics.reduce((highest, item) => Math.max(highest, item.switches), 0);

  return (
    <Card className="rounded-[1.75rem]">
      <CardHeader>
        <CardTitle>Context Switching</CardTitle>
        <CardDescription>Calm OS converts scattered pings into structured decision queues.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {loadAnalytics.slice(0, 6).map((item) => (
            <div className="grid grid-cols-[42px_1fr_48px] items-center gap-3" key={item.label}>
              <span className="text-xs text-white/42">{item.label}</span>
              <div className="h-3 overflow-hidden rounded-full bg-white/[0.07]">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-calm-cyan to-calm-mint"
                  initial={{ width: 0 }}
                  whileInView={{ width: `${(item.switches / peak) * 100}%` }}
                  viewport={{ once: true }}
                />
              </div>
              <span className="text-right text-xs text-white/58">{item.switches}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            ["-41%", "interruptions"],
            ["2.4h", "recovered"],
            ["12", "decisions found"]
          ].map(([value, label]) => (
            <div className="rounded-2xl border border-white/9 bg-white/[0.04] p-4" key={label}>
              <div className="font-display text-2xl font-semibold text-calm-mint">{value}</div>
              <div className="mt-1 text-xs text-white/45">{label}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AIVizSection() {
  const nodes = [
    { label: "Inbox", icon: Inbox, tone: "mint" },
    { label: "Semantic rank", icon: BrainCircuit, tone: "cyan" },
    { label: "Noise filter", icon: EyeOff, tone: "amber" },
    { label: "Focus queue", icon: TimerReset, tone: "violet" },
    { label: "Action", icon: WandSparkles, tone: "mint" }
  ] as const;

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8" id="ai-visualization">
      <div className="glass-panel relative overflow-hidden rounded-[2rem] p-6 sm:p-8 lg:p-10">
        <div className="absolute inset-0 opacity-50 calm-grid" aria-hidden="true" />
        <div className="relative grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <Badge variant="mint">
              <Cpu className="h-3 w-3" />
              AI Visualization
            </Badge>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-normal sm:text-5xl">
              Every notification becomes a calm decision path.
            </h2>
            <p className="mt-5 text-base leading-8 text-white/62">
              The AI extracts intent, detects emotional load, finds hidden commitments,
              suppresses duplicates, and proposes the next best action in one quiet flow.
            </p>
          </div>
          <div className="relative min-h-[420px] overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/28 p-5">
            <div className="absolute left-8 right-8 top-1/2 h-px bg-gradient-to-r from-calm-mint/10 via-white/24 to-calm-amber/10" />
            <div className="relative grid h-full grid-cols-1 gap-4 sm:grid-cols-5 sm:items-center">
              {nodes.map((node, index) => {
                const Icon = node.icon;
                return (
                  <motion.div
                    animate={{ y: [0, index % 2 ? 10 : -10, 0] }}
                    className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 text-center backdrop-blur-xl"
                    key={node.label}
                    transition={{ duration: 4.5 + index * 0.4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <div
                      className={cn(
                        "mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border",
                        node.tone === "mint" && "border-calm-mint/25 bg-calm-mint/10 text-calm-mint",
                        node.tone === "cyan" && "border-calm-cyan/25 bg-calm-cyan/10 text-calm-cyan",
                        node.tone === "amber" && "border-calm-amber/25 bg-calm-amber/10 text-calm-amber",
                        node.tone === "violet" && "border-calm-violet/25 bg-calm-violet/10 text-calm-violet"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="mt-3 text-sm font-medium">{node.label}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureSection() {
  const features = [
    {
      icon: Inbox,
      title: "Priority aggregation",
      description: "Every platform is normalized into one calm signal model."
    },
    {
      icon: Sparkles,
      title: "Briefings that decide",
      description: "AI summaries highlight decisions, blockers, owners, and deadlines."
    },
    {
      icon: TimerReset,
      title: "Focus protection",
      description: "Low-priority channels are suppressed during deep-work windows."
    },
    {
      icon: Waves,
      title: "Voice triage",
      description: "Ask the assistant to reply, defer, delegate, or summarize hands-free."
    },
    {
      icon: BarChart3,
      title: "Load analytics",
      description: "Measure notification pressure, context switching, and focus recovery."
    },
    {
      icon: Layers3,
      title: "Adaptive workspaces",
      description: "The interface shifts visual intensity based on mental load."
    }
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8" id="features">
      <div className="max-w-3xl">
        <Badge variant="violet">
          <Sparkles className="h-3 w-3" />
          Built for calm velocity
        </Badge>
        <h2 className="mt-4 font-display text-3xl font-semibold tracking-normal sm:text-5xl">
          Premium AI UX without dashboard fatigue.
        </h2>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <motion.div
              className="quiet-card group rounded-[1.5rem] p-5 transition hover:-translate-y-1 hover:border-white/16"
              initial={{ opacity: 0, y: 16 }}
              key={feature.title}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              viewport={{ once: true }}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-calm-mint/20 bg-calm-mint/10 text-calm-mint">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/58">{feature.description}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

function OnboardingSection() {
  const steps = [
    ["Connect", "Add work and personal channels with clear permission scopes."],
    ["Calibrate", "Choose what feels urgent, distracting, social, or deep-work worthy."],
    ["Protect", "Let the AI create daily focus windows and calm digest rules."]
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <div>
          <Badge variant="amber">
            <ShieldCheck className="h-3 w-3" />
            Smooth onboarding
          </Badge>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-normal sm:text-5xl">
            Start calm in under three minutes.
          </h2>
          <p className="mt-5 text-base leading-8 text-white/62">
            Progressive disclosure keeps setup light: connect sources, calibrate what
            matters, then let the AI tune itself from behavior.
          </p>
        </div>
        <div className="glass-panel rounded-[2rem] p-5">
          <div className="space-y-4">
            {steps.map(([title, body], index) => (
              <div className="grid grid-cols-[48px_1fr] gap-4 rounded-2xl border border-white/9 bg-white/[0.04] p-4" key={title}>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-calm-mint/20 bg-calm-mint/10 font-display text-lg font-semibold text-calm-mint">
                  {index + 1}
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-white/58">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid gap-4 lg:grid-cols-3">
        {testimonials.map((testimonial) => (
          <figure className="quiet-card rounded-[1.5rem] p-6" key={testimonial.name}>
            <div className="flex gap-1 text-calm-amber">
              {Array.from({ length: 5 }).map((_, index) => (
                <Sparkles className="h-4 w-4" key={index} />
              ))}
            </div>
            <blockquote className="mt-5 text-base leading-8 text-white/78">
              &ldquo;{testimonial.quote}&rdquo;
            </blockquote>
            <figcaption className="mt-6">
              <div className="font-display font-semibold">{testimonial.name}</div>
              <div className="mt-1 text-sm text-white/45">{testimonial.role}</div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function CTASection({ commandOpen }: { commandOpen: () => void }) {
  return (
    <footer className="px-4 pb-8 pt-16 sm:px-6 lg:px-8">
      <div className="glass-panel mx-auto max-w-7xl overflow-hidden rounded-[2rem] p-8 text-center sm:p-12">
        <AIOrb compact={false} label="Ready to calm your workday" listening={false} />
        <h2 className="mx-auto mt-8 max-w-3xl font-display text-3xl font-semibold tracking-normal sm:text-5xl">
          Replace information overload with one intelligent operating layer.
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/62">
          Digital Calm OS turns scattered platforms into a focused daily brief,
          a protected workspace, and an AI action queue.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button onClick={commandOpen} size="lg">
            <Command className="h-4 w-4" />
            Try command center
          </Button>
          <Button asChild size="lg" variant="calm">
            <a href="#inbox">
              View product
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-2 py-8 text-sm text-white/42 sm:flex-row sm:items-center sm:justify-between">
        <span>Digital Calm OS</span>
        <span>AI priority inbox, focus protection, and cognitive load analytics.</span>
      </div>
    </footer>
  );
}

function MentalLoadCard() {
  return (
    <div className="rounded-2xl border border-white/9 bg-white/[0.045] p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-white/45">Mental load score</div>
          <div className="mt-1 font-display text-4xl font-semibold text-calm-mint">31</div>
        </div>
        <Gauge className="h-8 w-8 text-calm-mint" />
      </div>
      <Progress className="mt-4" value={31} tone="mint" />
      <p className="mt-3 text-xs leading-5 text-white/52">
        Down from 78 after AI muted duplicate threads and non-urgent social updates.
      </p>
    </div>
  );
}

function LiveActivity({ signal }: { signal: string }) {
  return (
    <div className="rounded-2xl border border-white/9 bg-white/[0.045] p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-[0.2em] text-white/42">Live activity</div>
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-calm-mint opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-calm-mint" />
        </span>
      </div>
      <motion.p
        animate={{ opacity: 1, y: 0 }}
        className="mt-3 min-h-12 text-sm leading-6 text-white/68"
        initial={{ opacity: 0, y: 8 }}
        key={signal}
      >
        {signal}
      </motion.p>
    </div>
  );
}

function AssistantDock({
  assistantOpen,
  close,
  liveSignal,
  open,
  typedMessage
}: {
  assistantOpen: boolean;
  close: () => void;
  liveSignal: string;
  open: () => void;
  typedMessage: string;
}) {
  return (
    <>
      <motion.button
        aria-label="Open AI assistant"
        className="fixed bottom-5 right-5 z-40 rounded-3xl border border-white/12 bg-black/55 p-3 text-left shadow-2xl shadow-black/40 backdrop-blur-2xl transition hover:border-calm-mint/30"
        onClick={open}
        whileHover={{ y: -3 }}
      >
        <AIOrb compact label="Calm Assistant" />
      </motion.button>

      <motion.aside
        animate={assistantOpen ? { opacity: 1, x: 0, pointerEvents: "auto" } : { opacity: 0, x: 32, pointerEvents: "none" }}
        className="fixed bottom-24 right-4 z-50 w-[calc(100vw-2rem)] max-w-md overflow-hidden rounded-[2rem] border border-white/12 bg-black/78 shadow-2xl shadow-black/50 backdrop-blur-2xl sm:right-5"
        initial={false}
        transition={{ duration: 0.22 }}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <AIOrb compact label="Voice triage active" />
          <Button aria-label="Close AI assistant" onClick={close} size="icon" variant="ghost">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-4 p-5">
          <div className="rounded-2xl border border-calm-mint/18 bg-calm-mint/10 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-calm-mint">
              <Mic2 className="h-3.5 w-3.5" />
              AI typing
            </div>
            <p className="min-h-20 text-sm leading-6 text-white/78">
              {typedMessage}
              <span className="ml-1 inline-block h-4 w-1 animate-pulse rounded-full bg-calm-mint align-middle" />
            </p>
          </div>
          <div className="rounded-2xl border border-white/9 bg-white/[0.045] p-4">
            <div className="text-xs text-white/45">Current live signal</div>
            <p className="mt-2 text-sm leading-6 text-white/68">{liveSignal}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {["Reply now", "Delegate", "Summarize", "Ignore"].map((label, index) => (
              <Button key={label} size="sm" variant={index === 0 ? "signal" : "calm"}>
                {label}
              </Button>
            ))}
          </div>
        </div>
      </motion.aside>
    </>
  );
}

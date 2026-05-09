"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  Command,
  Cpu,
  EyeOff,
  FileText,
  Gauge,
  Inbox,
  Layers3,
  Mail,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  TimerReset,
  WandSparkles,
  X,
  Zap
} from "lucide-react";
import { AmbientBackground } from "@/components/ambient-background";
import { AIOrb } from "@/components/ai-orb";
import { LoadAreaChart, PlatformBarChart } from "@/components/analytics-charts";
import { CommandPalette } from "@/components/command-palette";
import { FocusTimer } from "@/components/focus-timer";
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
import type { AIBriefing, PriorityLabel } from "@/lib/ai-types";
import {
  type ConnectorConnection,
  type ConnectorProviderId
} from "@/lib/connectors";
import type { Platform, PriorityItem } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const providerIds: ConnectorProviderId[] = ["gmail", "google-calendar", "google-tasks"];

const sourceCopy: Record<
  ConnectorProviderId,
  { name: string; icon: LucideIcon; tone: string; accent: string }
> = {
  gmail: {
    name: "Gmail",
    icon: Mail,
    tone: "text-calm-mint",
    accent: "from-calm-mint/20 to-calm-cyan/5"
  },
  "google-calendar": {
    name: "Google Calendar",
    icon: CalendarDays,
    tone: "text-calm-amber",
    accent: "from-calm-amber/20 to-calm-rose/5"
  },
  "google-tasks": {
    name: "Google Tasks",
    icon: Inbox,
    tone: "text-calm-cyan",
    accent: "from-calm-cyan/20 to-calm-violet/5"
  }
};

const platformCopy: Record<Platform, { name: string; icon: LucideIcon; tone: string }> = {
  Gmail: { name: "Gmail", icon: Mail, tone: "text-calm-mint" },
  Slack: { name: "Slack", icon: Inbox, tone: "text-calm-cyan" },
  Discord: { name: "Discord", icon: Inbox, tone: "text-calm-violet" },
  WhatsApp: { name: "WhatsApp", icon: Inbox, tone: "text-calm-rose" },
  Calendar: { name: "Calendar", icon: CalendarDays, tone: "text-calm-amber" },
  Notion: { name: "Notion", icon: FileText, tone: "text-white" },
  Tasks: { name: "Tasks", icon: Inbox, tone: "text-calm-cyan" },
  Trello: { name: "Tasks", icon: Inbox, tone: "text-calm-cyan" }
};

type LoadAnalyticsPoint = {
  label: string;
  pressure: number;
  focus: number;
};

function clampLoadChart(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildLoadAnalyticsData(
  signals: PriorityItem[],
  loadScore: number,
  focusScore: number
): LoadAnalyticsPoint[] {
  const signalCount = signals.length;
  const averagePriority = signalCount
    ? signals.reduce((sum, signal) => sum + signal.priority, 0) / signalCount
    : 50;
  const pressureBase = clampLoadChart(42 + signalCount * 8 + (averagePriority - 50) * 0.3);
  const focusBase = clampLoadChart(focusScore);

  return [
    { label: "Now", pressure: clampLoadChart(pressureBase), focus: clampLoadChart(focusBase - 8) },
    { label: "30m", pressure: clampLoadChart(pressureBase + 5), focus: clampLoadChart(focusBase - 2) },
    { label: "1h", pressure: clampLoadChart(pressureBase + 10), focus: clampLoadChart(focusBase + 3) },
    { label: "2h", pressure: clampLoadChart(pressureBase + 6), focus: clampLoadChart(focusBase + 6) }
  ];
}

const priorityTone: Record<PriorityLabel, "rose" | "amber" | "cyan" | "default" | "violet"> = {
  Critical: "rose",
  Important: "amber",
  Medium: "cyan",
  "Low Priority": "default",
  Distraction: "violet"
};

const liveActivity = [
  "Gemini ranked the live inbox by decision urgency",
  "Focus Mode can hide low-signal updates automatically",
  "Daily briefing compressed synced work into a decision plan",
  "Calendar and task signals are being normalized into one queue"
];

export function DashboardPage() {
  const router = useRouter();
  const [connections, setConnections] = useState<Partial<Record<ConnectorProviderId, ConnectorConnection>>>({});
  const [signals, setSignals] = useState<PriorityItem[]>([]);
  const [briefing, setBriefing] = useState<AIBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState("Loading connected sources...");
  const [focusMode, setFocusMode] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [moodIndex, setMoodIndex] = useState(0);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
        const sessionPayload = (await sessionResponse.json()) as { user?: unknown };
        if (!sessionPayload.user) {
          router.push("/auth");
          return;
        }

        const connectionResponse = await fetch("/api/connections", { cache: "no-store" });
        const connectionPayload = (await connectionResponse.json()) as {
          connections?: Partial<Record<ConnectorProviderId, ConnectorConnection>>;
        };
        const nextConnections = connectionPayload.connections ?? {};
        setConnections(nextConnections);
        setLoading(false);

        const connectedIds = providerIds.filter((id) => nextConnections[id]);
        if (!connectedIds.length) {
          setSyncMessage("No connected Google sources yet.");
          setBriefing(createClientBriefing([]));
          return;
        }

        setSyncing(true);
        const syncResults = await Promise.allSettled(
          connectedIds.map(async (providerId) => {
            const response = await fetch(`/api/sync/${providerId}`, { method: "POST" });
            const payload = (await response.json()) as { signals?: PriorityItem[]; error?: string };
            if (!response.ok) throw new Error(payload.error ?? `${providerId} sync failed.`);
            return payload.signals ?? [];
          })
        );

        const synced = syncResults
          .filter((result): result is PromiseFulfilledResult<PriorityItem[]> => result.status === "fulfilled")
          .flatMap((result) => result.value)
          .sort((a, b) => b.priority - a.priority);
        const failedCount = syncResults.filter((result) => result.status === "rejected").length;

        setSignals(synced);
        setSyncing(false);
        setSyncMessage(
          failedCount
            ? `${synced.length} update${synced.length === 1 ? "" : "s"} synced. ${failedCount} source${failedCount === 1 ? "" : "s"} need attention.`
            : synced.length
              ? `${synced.length} live update${synced.length === 1 ? "" : "s"} synced and AI-ranked.`
              : "Connected sources returned no current updates."
        );
        await loadBriefing(synced);
      } catch (error) {
        setLoading(false);
        setSyncing(false);
        setBriefing(createClientBriefing([]));
        setSyncMessage(error instanceof Error ? error.message : "Dashboard loading failed.");
      }
    };

    const loadBriefing = async (nextSignals: PriorityItem[]) => {
      setBriefingLoading(true);
      try {
        const response = await fetch("/api/ai/briefing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ signals: nextSignals })
        });
        const payload = (await response.json()) as {
          briefing?: AIBriefing;
          rankedSignals?: PriorityItem[];
        };

        if (payload.rankedSignals?.length) {
          setSignals(payload.rankedSignals);
        }

        setBriefing(payload.briefing ?? createClientBriefing(nextSignals));
      } catch {
        setBriefing(createClientBriefing(nextSignals));
      } finally {
        setBriefingLoading(false);
      }
    };

    void loadDashboard();
  }, [router]);

  const visibleSignals = useMemo(() => {
    return signals
      .filter((signal) => (focusMode ? !shouldHideInFocus(signal) : true))
      .sort((a, b) => b.priority - a.priority);
  }, [focusMode, signals]);

  const connectedCount = Object.keys(connections).length;
  const urgentCount = visibleSignals.filter((signal) => getPriorityLabel(signal) === "Critical").length;
  const importantCount = visibleSignals.filter((signal) => getPriorityLabel(signal) === "Important").length;
  const hiddenCount = signals.filter(shouldHideInFocus).length;
  const loadScore = Math.max(12, 78 - connectedCount * 10 - hiddenCount * 2 - (focusMode ? 16 : 0));
  const productivityScore = Math.min(98, 66 + connectedCount * 7 + importantCount * 2 + (focusMode ? 8 : 0));
  const focusScore = Math.min(99, 60 + connectedCount * 8 + hiddenCount * 3 + (focusMode ? 12 : 0));
  const loadAnalyticsData = useMemo(
    () => buildLoadAnalyticsData(visibleSignals, loadScore, focusScore),
    [visibleSignals, loadScore, focusScore]
  );
  const activeBriefing = briefing ?? createClientBriefing(signals);

  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <AmbientBackground />
      <div className="calm-grid fixed inset-0 z-0 opacity-40" aria-hidden="true" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_0%,rgba(120,255,214,0.12),transparent_34rem),radial-gradient(circle_at_88%_26%,rgba(185,163,255,0.10),transparent_28rem)]" />
      <DashboardSidebar commandOpen={() => setCommandOpen(true)} />

      <section className="relative z-10 min-h-screen px-4 py-5 lg:pl-28 lg:pr-6">
        <header className="glass-panel sticky top-4 z-30 flex flex-col gap-4 rounded-[1.5rem] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.22em] text-calm-mint">
              AI Operating System
            </div>
            <h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">
              Mental clarity command center
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setCommandOpen(true)} variant="calm">
              <Command className="h-4 w-4" />
              Command
            </Button>
            <Button onClick={() => setFocusMode((value) => !value)} variant={focusMode ? "signal" : "calm"}>
              <EyeOff className="h-4 w-4" />
              {focusMode ? "Focus active" : "Focus mode"}
            </Button>
          </div>
        </header>

        {loading ? (
          <DashboardSkeleton />
        ) : (
          <div className="mx-auto max-w-7xl py-6">
            <DashboardHero
              briefing={activeBriefing}
              briefingLoading={briefingLoading}
              connectedCount={connectedCount}
              focusMode={focusMode}
              hiddenCount={hiddenCount}
              signalCount={visibleSignals.length}
              syncMessage={syncMessage}
              syncing={syncing}
              urgentCount={urgentCount}
              onAssistant={() => setAssistantOpen(true)}
              onFocusMode={() => setFocusMode((value) => !value)}
            />

            <ConnectedSources connections={connections} syncMessage={syncMessage} syncing={syncing} />

            <div className="mt-5 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
              <DailyBriefingPanel
                briefing={activeBriefing}
                briefingLoading={briefingLoading}
                hiddenCount={hiddenCount}
                signals={visibleSignals}
                urgentCount={urgentCount}
              />
              <CognitiveLoadPanel
                focusScore={focusScore}
                loadScore={loadScore}
                productivityScore={productivityScore}
                data={loadAnalyticsData}
              />
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
              <PriorityEnginePanel signals={visibleSignals} />
              <FocusAndRecommendationsPanel
                briefing={activeBriefing}
                focusMode={focusMode}
                setFocusMode={setFocusMode}
                signals={signals}
              />
            </div>

            <WorkstreamSections signals={signals} />
            <SummarySections connections={connections} signals={signals} />
          </div>
        )}
      </section>

      <FloatingAssistant
        briefing={activeBriefing}
        close={() => setAssistantOpen(false)}
        open={() => setAssistantOpen(true)}
        openState={assistantOpen}
        signalCount={visibleSignals.length}
      />
      <CommandPalette
        onAssistant={() => setAssistantOpen(true)}
        onFocusMode={() => setFocusMode((value) => !value)}
        onOpenChange={setCommandOpen}
        onThemeShift={() => setMoodIndex((value) => value + 1)}
        open={commandOpen}
      />
      <span className="sr-only">Workspace mood {moodIndex}</span>
    </main>
  );
}

function DashboardHero({
  briefing,
  briefingLoading,
  connectedCount,
  focusMode,
  hiddenCount,
  onAssistant,
  onFocusMode,
  signalCount,
  syncMessage,
  syncing,
  urgentCount
}: {
  briefing: AIBriefing;
  briefingLoading: boolean;
  connectedCount: number;
  focusMode: boolean;
  hiddenCount: number;
  onAssistant: () => void;
  onFocusMode: () => void;
  signalCount: number;
  syncMessage: string;
  syncing: boolean;
  urgentCount: number;
}) {
  const status = syncing ? "Syncing live work graph" : "AI operating layer online";
  const stats: Array<{
    label: string;
    value: number;
    icon: LucideIcon;
    tone: "cyan" | "rose" | "violet";
  }> = [
    { label: "Signals", value: signalCount, icon: Activity, tone: "cyan" },
    { label: "Critical", value: urgentCount, icon: AlertTriangle, tone: "rose" },
    { label: "Hidden", value: hiddenCount, icon: EyeOff, tone: "violet" }
  ];

  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      className="screen-glow relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/48 p-5 backdrop-blur-2xl sm:p-7 lg:p-8"
      initial={{ opacity: 0, y: 16 }}
      id="briefing"
    >
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(120,255,214,0.13),transparent_36%,rgba(114,233,255,0.08)_58%,rgba(185,163,255,0.12))]" />
      <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-calm-mint/70 to-transparent" />
      <div className="relative grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <Badge variant={briefing.generatedBy === "Gemini" ? "mint" : "cyan"}>
            <Sparkles className="h-3 w-3" />
            {briefing.generatedBy === "Gemini" ? "Gemini decision engine" : "Local AI fallback"}
          </Badge>
          <h2 className="mt-5 max-w-3xl font-display text-4xl font-semibold leading-[1.02] sm:text-5xl lg:text-6xl">
            {briefing.headline}
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-8 text-white/68">
            {briefing.narrative}
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button onClick={onAssistant} size="lg" variant="signal">
              <WandSparkles className="h-4 w-4" />
              Ask AI assistant
            </Button>
            <Button onClick={onFocusMode} size="lg" variant="calm">
              <TimerReset className="h-4 w-4" />
              {focusMode ? "Release focus filter" : "Enter focus mode"}
            </Button>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="glass-panel relative overflow-hidden rounded-[1.5rem] p-5">
            <div className="absolute inset-0 scan-line opacity-30" aria-hidden="true" />
            <div className="relative flex items-center justify-between gap-5">
              <AIOrb compact label={status} />
              <Badge variant={syncing ? "amber" : "mint"}>
                {syncing ? <RefreshCw className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
                {syncing ? "Syncing" : "Live"}
              </Badge>
            </div>
            <p className="relative mt-5 text-sm leading-6 text-white/58">{syncMessage}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {stats.map(({ icon: Icon, label, tone, value }) => (
              <motion.div
                className="rounded-2xl border border-white/9 bg-white/[0.05] p-4"
                key={label}
                whileHover={{ y: -3 }}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-white/45">{label}</span>
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      tone === "cyan" && "text-calm-cyan",
                      tone === "rose" && "text-calm-rose",
                      tone === "violet" && "text-calm-violet"
                    )}
                  />
                </div>
                <div className="mt-3 font-display text-3xl font-semibold">{value}</div>
              </motion.div>
            ))}
          </div>

          <div className="rounded-2xl border border-white/9 bg-white/[0.045] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-white/42">
                Live activity
              </span>
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-calm-mint opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-calm-mint" />
              </span>
            </div>
            <div className="grid gap-2">
              {liveActivity.map((item, index) => (
                <motion.div
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 text-sm text-white/62"
                  initial={{ opacity: 0, x: 10 }}
                  key={item}
                  transition={{ delay: index * 0.06 }}
                >
                  <Zap className="h-3.5 w-3.5 text-calm-mint" />
                  <span>{briefingLoading && index === 0 ? "Generating premium AI briefing..." : item}</span>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/9 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/52">Connected app graph</span>
              <span className="font-display text-xl font-semibold text-calm-mint">{connectedCount}/3</span>
            </div>
            <Progress className="mt-3" value={(connectedCount / 3) * 100} tone="mint" />
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function DashboardSidebar({ commandOpen }: { commandOpen: () => void }) {
  const nav = [
    { icon: BrainCircuit, label: "Briefing", target: "briefing" },
    { icon: Mail, label: "Gmail", target: "gmail-section" },
    { icon: CalendarDays, label: "Calendar", target: "calendar-section" },
    { icon: Inbox, label: "Tasks", target: "tasks-section" },
    { icon: BarChart3, label: "Analytics", target: "analytics" }
  ];

  return (
    <motion.aside
      animate={{ x: 0, opacity: 1 }}
      className="fixed left-4 top-4 z-40 hidden h-[calc(100vh-2rem)] w-20 flex-col items-center justify-between rounded-[1.5rem] border border-white/10 bg-black/35 p-3 shadow-2xl shadow-black/30 backdrop-blur-2xl lg:flex"
      initial={{ x: -24, opacity: 0 }}
    >
      <Link
        className="flex h-12 w-12 items-center justify-center rounded-2xl border border-calm-mint/25 bg-calm-mint/10 text-calm-mint"
        href="/"
      >
        <BrainCircuit className="h-6 w-6" />
      </Link>
      <div className="space-y-3">
        {nav.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              aria-label={item.label}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-2xl border transition hover:-translate-y-0.5 hover:text-white",
                index === 0
                  ? "border-calm-mint/25 bg-calm-mint/10 text-calm-mint"
                  : "border-white/9 bg-white/[0.04] text-white/42"
              )}
              key={item.label}
              onClick={() => scrollToDashboardSection(item.target)}
            >
              <Icon className="h-5 w-5" />
            </button>
          );
        })}
      </div>
      <button
        aria-label="Open command palette"
        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white/56 hover:text-white"
        onClick={commandOpen}
      >
        <Command className="h-5 w-5" />
      </button>
    </motion.aside>
  );
}

function scrollToDashboardSection(sectionId: string) {
  document.getElementById(sectionId)?.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function ConnectedSources({
  connections,
  syncMessage,
  syncing
}: {
  connections: Partial<Record<ConnectorProviderId, ConnectorConnection>>;
  syncMessage: string;
  syncing: boolean;
}) {
  return (
    <section className="mt-5 grid gap-4 md:grid-cols-3" id="connected-sources">
      {providerIds.map((id) => {
        const copy = sourceCopy[id];
        const Icon = copy.icon;
        const connected = Boolean(connections[id]);

        return (
          <motion.div
            className={cn(
              "quiet-card group relative overflow-hidden rounded-[1.5rem] p-5 transition hover:-translate-y-1",
              connected ? "border-calm-mint/20" : "opacity-72"
            )}
            key={id}
            whileHover={{ y: -4 }}
          >
            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 transition group-hover:opacity-100", copy.accent)} />
            <div className="relative flex items-center justify-between gap-3">
              <span className={cn("flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]", copy.tone)}>
                <Icon className="h-5 w-5" />
              </span>
              <Badge variant={connected ? "mint" : "default"}>
                {connected ? "Connected" : "Not connected"}
              </Badge>
            </div>
            <h2 className="relative mt-5 font-display text-lg font-semibold">{copy.name}</h2>
            <p className="relative mt-2 text-sm leading-6 text-white/52">
              {connected
                ? syncMessage
                : "Connect this source to enrich your AI dashboard."}
            </p>
            {syncing && connected ? (
              <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                <motion.div
                  animate={{ x: ["-100%", "120%"] }}
                  className="h-full w-1/2 rounded-full bg-calm-mint"
                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
            ) : null}
          </motion.div>
        );
      })}
    </section>
  );
}

function DailyBriefingPanel({
  briefing,
  briefingLoading,
  hiddenCount,
  signals,
  urgentCount
}: {
  briefing: AIBriefing;
  briefingLoading: boolean;
  hiddenCount: number;
  signals: PriorityItem[];
  urgentCount: number;
}) {
  const stats: Array<{
    label: string;
    value: number;
    icon: LucideIcon;
    tone: "rose" | "mint" | "violet";
  }> = [
    { label: "Critical", value: urgentCount, icon: AlertTriangle, tone: "rose" },
    { label: "Ranked", value: signals.length, icon: BrainCircuit, tone: "mint" },
    { label: "Hidden", value: hiddenCount, icon: EyeOff, tone: "violet" }
  ];

  return (
    <Card className="overflow-hidden rounded-[1.75rem]">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-2xl">AI Daily Briefing</CardTitle>
            <CardDescription>
              Human-readable synthesis from synced emails, messages, meetings, and tasks.
            </CardDescription>
          </div>
          <Badge variant={briefing.generatedBy === "Gemini" ? "mint" : "cyan"}>
            {briefingLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            {briefing.generatedBy}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-2xl border border-calm-mint/18 bg-calm-mint/10 p-5">
          <p className="text-sm leading-7 text-white/78">{briefing.narrative}</p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {stats.map(({ icon: Icon, label, tone, value }) => (
            <div className="rounded-2xl border border-white/9 bg-white/[0.04] p-4" key={label}>
              <div className="flex items-center justify-between gap-3">
                <div className="font-display text-2xl font-semibold text-white">{value}</div>
                <Icon
                  className={cn(
                    "h-4 w-4",
                    tone === "rose" && "text-calm-rose",
                    tone === "mint" && "text-calm-mint",
                    tone === "violet" && "text-calm-violet"
                  )}
                />
              </div>
              <div className="mt-1 text-xs text-white/45">{label}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {briefing.highlights.slice(0, 3).map((highlight, index) => (
            <motion.div
              className="rounded-2xl border border-white/9 bg-white/[0.04] p-4 text-sm leading-6 text-white/62"
              initial={{ opacity: 0, y: 10 }}
              key={`${highlight}-${index}`}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <CheckCircle2 className="mb-3 h-4 w-4 text-calm-mint" />
              {highlight}
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CognitiveLoadPanel({
  focusScore,
  loadScore,
  productivityScore,
  data
}: {
  focusScore: number;
  loadScore: number;
  productivityScore: number;
  data: LoadAnalyticsPoint[];
}) {
  return (
    <Card className="overflow-hidden rounded-[1.75rem]">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-2xl">Cognitive Load Analytics</CardTitle>
            <CardDescription>Signal pressure, focus recovery, and notification load in one view.</CardDescription>
          </div>
          <Gauge className="h-6 w-6 text-calm-cyan" />
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Metric label="Overload" tone="rose" value={loadScore} />
          <Metric label="Productivity" tone="mint" value={productivityScore} />
          <Metric label="Focus" tone="cyan" value={focusScore} />
        </div>
        <div className="rounded-2xl border border-white/9 bg-black/22 p-3">
          <LoadAreaChart data={data} />
        </div>
      </CardContent>
    </Card>
  );
}

function PriorityEnginePanel({ signals }: { signals: PriorityItem[] }) {
  return (
    <Card className="overflow-hidden rounded-[1.75rem]" id="inbox">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-2xl">AI Priority Engine</CardTitle>
            <CardDescription>Gemini ranks urgent emails, messages, tasks, meetings, and distractions.</CardDescription>
          </div>
          <Badge variant="mint">
            <Cpu className="h-3 w-3" />
            Decision flow
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {signals.length ? (
          signals.map((signal, index) => {
            const source = getSignalSource(signal);
            const Icon = source.icon;
            const label = getPriorityLabel(signal);

            return (
              <motion.article
                animate={{ opacity: 1, y: 0 }}
                className="group rounded-2xl border border-white/9 bg-white/[0.045] p-4 transition hover:border-white/16 hover:bg-white/[0.065]"
                initial={{ opacity: 0, y: 10 }}
                key={signal.id}
                transition={{ delay: index * 0.035 }}
              >
                <div className="flex gap-4">
                  <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/20", source.tone)}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={priorityTone[label]}>{label}</Badge>
                      <span className="text-xs text-white/42">{source.name}</span>
                      <span className="text-xs text-white/34">{signal.aiSource ?? "Local"} ranked</span>
                    </div>
                    <h3 className="mt-2 font-display text-base font-semibold">{signal.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-white/58">{signal.aiSummary ?? signal.summary}</p>
                    {signal.recommendation ? (
                      <p className="mt-3 rounded-xl border border-calm-mint/14 bg-calm-mint/[0.08] px-3 py-2 text-xs leading-5 text-calm-mint">
                        {signal.recommendation}
                      </p>
                    ) : null}
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <Progress className="h-1.5" value={signal.priority} tone={label === "Critical" ? "rose" : "mint"} />
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-xs text-white/45">
                        Score {signal.priority}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.article>
            );
          })
        ) : (
          <EmptyDashboardState />
        )}
      </CardContent>
    </Card>
  );
}

function FocusAndRecommendationsPanel({
  briefing,
  focusMode,
  setFocusMode,
  signals
}: {
  briefing: AIBriefing;
  focusMode: boolean;
  setFocusMode: (value: boolean) => void;
  signals: PriorityItem[];
}) {
  return (
    <div className="space-y-5">
      <FocusTimer />
      <Card className="rounded-[1.75rem]">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Focus Mode</CardTitle>
            <CardDescription>Hide distractions and surface only high-priority work.</CardDescription>
          </div>
          <Button onClick={() => setFocusMode(!focusMode)} size="sm" variant={focusMode ? "signal" : "calm"}>
            <EyeOff className="h-4 w-4" />
            {focusMode ? "On" : "Off"}
          </Button>
        </CardHeader>
      </Card>

      <Card className="rounded-[1.75rem]">
        <CardHeader>
          <CardTitle>Smart Recommendations</CardTitle>
          <CardDescription>AI-generated next moves based on priority, urgency, and focus impact.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {briefing.recommendations.slice(0, 4).map((recommendation, index) => (
            <div className="grid grid-cols-[36px_1fr] gap-3 rounded-2xl border border-white/9 bg-white/[0.04] p-4" key={`${recommendation}-${index}`}>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-calm-mint/20 bg-calm-mint/10 text-calm-mint">
                {index + 1}
              </div>
              <p className="text-sm leading-6 text-white/66">{recommendation}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-[1.75rem]" id="analytics">
        <CardHeader>
          <CardTitle>Connected Apps Overview</CardTitle>
          <CardDescription>Signal pressure by source after AI normalization.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-5 rounded-2xl border border-white/9 bg-black/22 p-3">
            <PlatformBarChart signals={signals} />
          </div>
          <div className="space-y-4">
            {providerIds.map((providerId) => {
              const source = sourceCopy[providerId];
              const providerSignals = signals.filter(
                (signal) => getProviderFromSignal(signal) === providerId
              );
              const pressure = providerSignals.length
                ? Math.min(
                    100,
                    Math.round(
                      providerSignals.reduce((sum, signal) => sum + signal.priority, 0) /
                        providerSignals.length
                    )
                  )
                : 0;

              return (
                <div className="grid grid-cols-[116px_1fr_42px] items-center gap-3" key={providerId}>
                  <span className="truncate text-xs text-white/52">{source.name}</span>
                  <div className="h-3 overflow-hidden rounded-full bg-white/[0.07]">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-calm-cyan to-calm-mint"
                      initial={{ width: 0 }}
                      animate={{ width: `${pressure}%` }}
                      transition={{ duration: 0.7 }}
                    />
                  </div>
                  <span className="text-right text-xs text-calm-mint">{pressure}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function WorkstreamSections({ signals }: { signals: PriorityItem[] }) {
  const emailSignals = signals
    .filter((signal) => signal.platform === "Gmail")
    .sort((a, b) => b.priority - a.priority);
  const meetingSignals = signals
    .filter((signal) => signal.platform === "Calendar")
    .sort((a, b) => b.priority - a.priority);
  const taskSignals = signals
    .filter((signal) => getProviderFromSignal(signal) === "google-tasks")
    .sort((a, b) => b.priority - a.priority);

  return (
    <section className="mt-5 grid gap-5 lg:grid-cols-3">
      <WorkstreamCard
        empty="No Gmail signals are synced yet."
        icon={Mail}
        id="gmail-section"
        items={emailSignals}
        title="Critical Emails"
        tone="mint"
      />
      <WorkstreamCard
        empty="No meeting signals are synced yet."
        icon={CalendarDays}
        id="calendar-section"
        items={meetingSignals}
        title="Upcoming Meetings"
        tone="amber"
      />
      <WorkstreamCard
        empty="No important task signals are synced."
        icon={Target}
        id="tasks-section"
        items={taskSignals}
        title="Important Tasks"
        tone="cyan"
      />
    </section>
  );
}

function WorkstreamCard({
  empty,
  id,
  icon: Icon,
  items,
  title,
  tone
}: {
  empty: string;
  id: string;
  icon: LucideIcon;
  items: PriorityItem[];
  title: string;
  tone: "mint" | "amber" | "cyan";
}) {
  return (
    <Card className="rounded-[1.75rem] scroll-mt-24" id={id}>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <span
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-2xl border",
              tone === "mint" && "border-calm-mint/20 bg-calm-mint/10 text-calm-mint",
              tone === "amber" && "border-calm-amber/20 bg-calm-amber/10 text-calm-amber",
              tone === "cyan" && "border-calm-cyan/20 bg-calm-cyan/10 text-calm-cyan"
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
          <Badge variant={tone}>{items.length}</Badge>
        </div>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length ? (
          items.slice(0, 3).map((signal) => (
            <div className="rounded-2xl border border-white/9 bg-white/[0.04] p-4" key={signal.id}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="truncate font-display text-sm font-semibold">{signal.title}</h3>
                <span className="text-xs text-calm-mint">{signal.priority}</span>
              </div>
              <p className="mt-1 text-xs leading-5 text-white/52">{signal.aiSummary ?? signal.summary}</p>
            </div>
          ))
        ) : (
          <p className="rounded-2xl border border-white/9 bg-white/[0.04] p-4 text-sm leading-6 text-white/52">
            {empty}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function SummarySections({
  connections,
  signals
}: {
  connections: Partial<Record<ConnectorProviderId, ConnectorConnection>>;
  signals: PriorityItem[];
}) {
  const sections: Array<{
    platform: Platform;
    title: string;
    connected: boolean;
    fallback: string;
  }> = [
    {
      platform: "Gmail",
      title: "Smart Email Summaries",
      connected: Boolean(connections.gmail),
      fallback: "Connect Gmail to generate smart email summaries."
    },
    {
      platform: "Calendar",
      title: "Meeting Summaries",
      connected: Boolean(connections["google-calendar"]),
      fallback: "Connect Google Calendar to summarize meetings and conflicts."
    },
    {
      platform: "Tasks",
      title: "Task Summaries",
      connected: Boolean(connections["google-tasks"]),
      fallback: "Connect Google Tasks to summarize important tasks."
    }
  ];

  return (
    <section className="mt-5 grid gap-5 lg:grid-cols-3">
      {sections.map((section) => (
        <SourceSummaryCard
          connected={section.connected}
          fallback={section.fallback}
          key={section.title}
          platform={section.platform}
          signals={signals}
          title={section.title}
        />
      ))}
    </section>
  );
}

function SourceSummaryCard({
  connected,
  fallback,
  platform,
  signals,
  title
}: {
  connected: boolean;
  fallback: string;
  platform: Platform;
  signals: PriorityItem[];
  title: string;
}) {
  const source = platformCopy[platform];
  const Icon = source.icon;
  const sectionSignals = signals.filter((signal) => {
    if (platform === "Tasks") return getProviderFromSignal(signal) === "google-tasks";
    return signal.platform === platform;
  });

  return (
    <Card className="rounded-[1.75rem]">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <span className={cn("flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]", source.tone)}>
            <Icon className="h-5 w-5" />
          </span>
          <Badge variant={connected ? "mint" : "default"}>{connected ? "Live" : "Ready"}</Badge>
        </div>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sectionSignals.length ? (
          sectionSignals.slice(0, 2).map((signal) => (
            <div className="rounded-2xl border border-white/9 bg-white/[0.04] p-4" key={signal.id}>
              <h3 className="font-display text-sm font-semibold">{signal.title}</h3>
              <p className="mt-1 text-xs leading-5 text-white/52">{signal.aiSummary ?? signal.summary}</p>
            </div>
          ))
        ) : (
          <p className="rounded-2xl border border-white/9 bg-white/[0.04] p-4 text-sm leading-6 text-white/52">
            {fallback}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function FloatingAssistant({
  briefing,
  close,
  open,
  openState,
  signalCount
}: {
  briefing: AIBriefing;
  close: () => void;
  open: () => void;
  openState: boolean;
  signalCount: number;
}) {
  return (
    <>
      <motion.button
        aria-label="Open assistant"
        className="fixed bottom-5 right-5 z-40 rounded-3xl border border-white/12 bg-black/55 p-3 text-left shadow-2xl shadow-black/40 backdrop-blur-2xl"
        onClick={open}
        whileHover={{ y: -3 }}
      >
        <AIOrb compact label="Calm Assistant" />
      </motion.button>
      <motion.aside
        animate={openState ? { opacity: 1, x: 0, pointerEvents: "auto" } : { opacity: 0, x: 32, pointerEvents: "none" }}
        className="fixed bottom-24 right-4 z-50 w-[calc(100vw-2rem)] max-w-md overflow-hidden rounded-[2rem] border border-white/12 bg-black/78 shadow-2xl shadow-black/50 backdrop-blur-2xl sm:right-5"
      >
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <AIOrb compact label="Assistant ready" />
          <Button aria-label="Close assistant" onClick={close} size="icon" variant="ghost">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-4 p-5">
          <div className="rounded-2xl border border-calm-mint/18 bg-calm-mint/10 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-calm-mint">
              <WandSparkles className="h-3.5 w-3.5" />
              AI recommendation
            </div>
            <p className="text-sm leading-6 text-white/78">
              {signalCount
                ? briefing.recommendations[0] ?? "Handle critical items first, then enter a protected focus block."
                : "Connect Gmail, Calendar, or Tasks to generate assistant recommendations."}
            </p>
          </div>
          <div className="rounded-2xl border border-white/9 bg-white/[0.045] p-4">
            <div className="text-xs text-white/45">Briefing source</div>
            <p className="mt-2 text-sm leading-6 text-white/68">
              {briefing.generatedBy} priority and summarization flow
            </p>
          </div>
        </div>
      </motion.aside>
    </>
  );
}

function Metric({
  label,
  tone,
  value
}: {
  label: string;
  tone: "mint" | "cyan" | "rose";
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/9 bg-white/[0.04] p-4">
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="text-white/58">{label}</span>
        <span className="font-display text-xl font-semibold">{value}</span>
      </div>
      <Progress value={value} tone={tone === "rose" ? "rose" : tone} />
    </div>
  );
}

function EmptyDashboardState() {
  return (
    <div className="rounded-2xl border border-white/9 bg-white/[0.04] p-6 text-center">
      <Layers3 className="mx-auto h-8 w-8 text-calm-mint" />
      <h3 className="mt-4 font-display text-lg font-semibold">No connected updates yet</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/54">
        Connect Google platforms to turn real work signals into a calm priority queue.
      </p>
      <Button asChild className="mt-5" variant="signal">
        <Link href="/connect">
          Open connection setup
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

function getProviderFromSignal(signal: PriorityItem): ConnectorProviderId {
  if (signal.platform === "Gmail") return "gmail";
  if (signal.platform === "Calendar") return "google-calendar";
  return "google-tasks";
}

function getSignalSource(signal: PriorityItem) {
  return platformCopy[signal.platform] ?? platformCopy.Tasks;
}

function getPriorityLabel(signal: PriorityItem): PriorityLabel {
  if (signal.priorityLabel) return signal.priorityLabel;
  if (signal.priority >= 88) return "Critical";
  if (signal.priority >= 72) return "Important";
  if (signal.priority >= 52) return "Medium";
  if (signal.priority >= 32) return "Low Priority";
  return "Distraction";
}

function shouldHideInFocus(signal: PriorityItem) {
  return signal.hideInFocus ?? signal.priority < 70;
}

function createClientBriefing(signals: PriorityItem[]): AIBriefing {
  const ranked = [...signals].sort((a, b) => b.priority - a.priority);
  const critical = ranked.filter((signal) => getPriorityLabel(signal) === "Critical");
  const hidden = ranked.filter(shouldHideInFocus);

  if (!ranked.length) {
    return {
      headline: "Connect your work graph to activate the AI briefing",
      narrative:
        "Digital Calm OS is ready to rank emails, meetings, and tasks once sources are connected.",
      highlights: [
        "No live work signals are synced yet.",
        "Focus Mode is ready to suppress distractions.",
        "Gemini will take over summaries when GEMINI_API_KEY is configured."
      ],
      recommendations: [
        "Connect Gmail, Google Calendar, or Google Tasks.",
        "Sync the provider after OAuth is complete.",
        "Return here for a ranked decision queue."
      ],
      focusPlan: [
        "Connect sources",
        "Sync updates",
        "Start focus mode"
      ],
      riskLevel: "Low Priority",
      generatedBy: "Local"
    };
  }

  return {
    headline: critical.length
      ? `${critical.length} critical signal${critical.length === 1 ? "" : "s"} need attention`
      : "Your AI-ranked work queue is ready",
    narrative: `${ranked[0].title} is first in line. ${ranked.length} update${ranked.length === 1 ? "" : "s"} are ranked, and ${hidden.length} can stay hidden during focus mode.`,
    highlights: ranked.slice(0, 3).map((signal) => signal.aiSummary ?? signal.summary),
    recommendations: ranked
      .slice(0, 3)
      .map((signal) => signal.recommendation ?? `Review ${signal.title} after critical work is handled.`),
    focusPlan: [
      "Clear critical items first",
      "Batch medium and low-priority updates",
      "Start a protected focus block"
    ],
    riskLevel: getPriorityLabel(ranked[0]),
    generatedBy: ranked.some((signal) => signal.aiSource === "Gemini") ? "Gemini" : "Local"
  };
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-7xl py-6">
      <div className="screen-glow h-[520px] animate-pulse rounded-[2rem] border border-white/10 bg-white/[0.035]" />
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div className="quiet-card h-40 animate-pulse rounded-[1.5rem]" key={index} />
        ))}
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <div className="quiet-card h-80 animate-pulse rounded-[1.75rem]" />
        <div className="quiet-card h-80 animate-pulse rounded-[1.75rem]" />
      </div>
    </div>
  );
}

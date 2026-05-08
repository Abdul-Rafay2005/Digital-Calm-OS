import type { PriorityLabel } from "@/lib/ai-types";

export type Platform =
  | "Gmail"
  | "Slack"
  | "Discord"
  | "WhatsApp"
  | "Calendar"
  | "Notion"
  | "Tasks"
  | "Trello";

export type PriorityItem = {
  id: string;
  platform: Platform;
  title: string;
  sender: string;
  summary: string;
  category: "urgent" | "deep work" | "noise" | "social" | "deadlines" | "finance" | "team";
  priority: number;
  priorityLabel?: PriorityLabel;
  time: string;
  action: "Reply now" | "Ignore" | "Schedule later" | "Delegate" | "Summarize";
  impact: string;
  aiSummary?: string;
  recommendation?: string;
  hideInFocus?: boolean;
  reasoning?: string;
  confidence?: number;
  aiSource?: "Gemini" | "Local";
};

export const priorityInbox: PriorityItem[] = [
  {
    id: "signal-1",
    platform: "Gmail",
    title: "Investor follow-up needs final traction metric",
    sender: "Maya Chen",
    summary:
      "Only one detail is blocking the partner update. AI drafted a concise reply with the Q2 retention number attached.",
    category: "urgent",
    priority: 98,
    time: "08:12",
    action: "Reply now",
    impact: "Unblocks funding conversation"
  },
  {
    id: "signal-2",
    platform: "Calendar",
    title: "Design review moved 35 minutes earlier",
    sender: "Product sync",
    summary:
      "The system found two agenda overlaps and condensed the review notes into four decisions.",
    category: "deadlines",
    priority: 91,
    time: "09:05",
    action: "Schedule later",
    impact: "Prevents meeting conflict"
  },
  {
    id: "signal-3",
    platform: "Slack",
    title: "Payment webhook failing for EU workspace",
    sender: "Nora in #eng-alerts",
    summary:
      "A regression is isolated to retry metadata. Calm OS grouped 19 noisy follow-ups into this single critical thread.",
    category: "urgent",
    priority: 89,
    time: "09:28",
    action: "Delegate",
    impact: "Protects revenue path"
  },
  {
    id: "signal-4",
    platform: "Notion",
    title: "Launch brief has two unresolved decisions",
    sender: "Growth workspace",
    summary:
      "AI extracted owner, deadline, and open decision from a long doc and linked the source block.",
    category: "deep work",
    priority: 76,
    time: "10:16",
    action: "Summarize",
    impact: "Keeps launch moving"
  },
  {
    id: "signal-5",
    platform: "Discord",
    title: "Community praise thread detected",
    sender: "beta-calm channel",
    summary:
      "Positive sentiment spike. No action required today unless marketing wants a testimonial pull quote.",
    category: "social",
    priority: 44,
    time: "10:41",
    action: "Ignore",
    impact: "Low urgency"
  },
  {
    id: "signal-6",
    platform: "WhatsApp",
    title: "Family dinner logistics",
    sender: "Ava",
    summary:
      "Personal message grouped outside work focus. AI will remind you after the deep-work block.",
    category: "noise",
    priority: 24,
    time: "11:03",
    action: "Schedule later",
    impact: "Non-work context"
  }
];

export const dailySummary = [
  {
    title: "Three things matter before noon",
    body:
      "Investor reply, payment webhook owner, and design review prep. Everything else can wait until 14:00.",
    meta: "AI briefing",
    score: 94
  },
  {
    title: "Meetings compressed by 42 minutes",
    body:
      "Calm OS merged duplicate agenda items and produced a single decision log for product, design, and launch.",
    meta: "Calendar intelligence",
    score: 86
  },
  {
    title: "Noise filtered automatically",
    body:
      "167 low-signal notifications were batched into three calm digests with no urgent sentiment detected.",
    meta: "Smart filters",
    score: 91
  }
];

export const suggestedActions = [
  {
    action: "Send investor update",
    detail: "Draft ready with traction metric and 2-line context.",
    confidence: 98,
    tone: "mint"
  },
  {
    action: "Assign webhook incident",
    detail: "Recommend Nora as owner; she touched retry logic yesterday.",
    confidence: 92,
    tone: "cyan"
  },
  {
    action: "Move community review",
    detail: "Batch all social feedback into Friday's voice-of-customer pass.",
    confidence: 84,
    tone: "amber"
  },
  {
    action: "Start 50-minute focus block",
    detail: "Calendar is clean and critical replies are ready.",
    confidence: 89,
    tone: "violet"
  }
] as const;

export const loadAnalytics = [
  { label: "7a", pressure: 34, focus: 78, switches: 12 },
  { label: "8a", pressure: 61, focus: 64, switches: 24 },
  { label: "9a", pressure: 88, focus: 42, switches: 41 },
  { label: "10a", pressure: 72, focus: 54, switches: 33 },
  { label: "11a", pressure: 46, focus: 76, switches: 18 },
  { label: "12p", pressure: 39, focus: 82, switches: 14 },
  { label: "1p", pressure: 58, focus: 71, switches: 21 },
  { label: "2p", pressure: 44, focus: 86, switches: 13 }
];

export const platformSignals = [
  { platform: "Gmail", count: 47, muted: 31, critical: 3, color: "#78ffd6" },
  { platform: "Slack", count: 82, muted: 59, critical: 5, color: "#72e9ff" },
  { platform: "Calendar", count: 9, muted: 2, critical: 2, color: "#ffe19c" },
  { platform: "Notion", count: 18, muted: 10, critical: 1, color: "#b9a3ff" },
  { platform: "WhatsApp", count: 24, muted: 21, critical: 0, color: "#ff8eb6" }
];

export const mentalLoadHeatmap = [
  32, 28, 44, 63, 72, 41, 22, 25, 39, 58, 86, 91, 55, 37, 29, 36, 52, 74, 68,
  43, 31, 24, 34, 47, 77, 83, 61, 40
];

export const filterCategories = [
  { label: "Urgent", count: 7, active: true },
  { label: "Deep work", count: 12, active: true },
  { label: "Noise", count: 167, active: false },
  { label: "Social", count: 31, active: false },
  { label: "Deadlines", count: 5, active: true },
  { label: "Finance", count: 3, active: true },
  { label: "Team updates", count: 26, active: false }
];

export const testimonials = [
  {
    quote:
      "It feels less like a dashboard and more like a nervous system for work. Our exec team stopped missing the quiet urgent things.",
    name: "Iris Navarro",
    role: "COO, Northstar Labs"
  },
  {
    quote:
      "The first product that made notifications feel designed around humans instead of apps.",
    name: "Theo Park",
    role: "Partner, Signal Ridge"
  },
  {
    quote:
      "We shipped a calmer operating cadence in one week. The AI summaries alone changed how our team starts the day.",
    name: "Amara Sato",
    role: "Founder, Loomline"
  }
];

export const focusRecommendations = [
  "Mute social channels until 14:00",
  "Reply to Maya before entering focus",
  "Delegate the webhook incident to Nora",
  "Move low-confidence tasks to Friday review"
];

export const liveFeed = [
  "Calm OS grouped 42 Slack messages into 3 decisions",
  "Investor reply draft reached 98% confidence",
  "Focus window detected: 11:20-12:10",
  "Calendar conflict resolved automatically",
  "167 notifications converted into calm digest"
];

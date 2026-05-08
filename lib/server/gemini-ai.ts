import "server-only";

import type { AIBriefing, PriorityLabel } from "@/lib/ai-types";
import type { PriorityItem } from "@/lib/mock-data";

type GeminiPart = {
  text?: string;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
  promptFeedback?: {
    blockReason?: string;
  };
};

type GeminiSignalDecision = {
  id: string;
  priority?: number;
  priorityLabel?: PriorityLabel;
  summary?: string;
  recommendation?: string;
  hideInFocus?: boolean;
  action?: PriorityItem["action"];
  impact?: string;
  category?: PriorityItem["category"];
  reasoning?: string;
  confidence?: number;
};

type GeminiSignalPayload = {
  items?: GeminiSignalDecision[];
};

const allowedActions = [
  "Reply now",
  "Ignore",
  "Schedule later",
  "Delegate",
  "Summarize"
] satisfies PriorityItem["action"][];

const allowedCategories = [
  "urgent",
  "deep work",
  "noise",
  "social",
  "deadlines",
  "finance",
  "team"
] satisfies PriorityItem["category"][];

const priorityLabels: PriorityLabel[] = [
  "Critical",
  "Important",
  "Medium",
  "Low Priority",
  "Distraction"
];

export async function enrichSignalsWithGemini(
  signals: PriorityItem[],
  context = "connected workspace signals"
) {
  if (!signals.length) return signals;

  const prompt = buildSignalRankingPrompt(signals, context);
  const payload = await requestGeminiJson<GeminiSignalPayload>(prompt, 2600);

  if (!payload?.items?.length) {
    return rankSignalsLocally(signals);
  }

  const byId = new Map(payload.items.map((item) => [item.id, item]));

  return signals
    .map((signal) => mergeGeminiDecision(signal, byId.get(signal.id)))
    .sort(sortByPriority);
}

export async function generateDailyBriefingWithGemini(
  signals: PriorityItem[]
): Promise<AIBriefing> {
  const rankedSignals = signals.length ? rankSignalsLocally(signals) : signals;
  const prompt = buildBriefingPrompt(rankedSignals);
  const payload = await requestGeminiJson<Partial<AIBriefing>>(prompt, 1800);

  if (!payload?.headline || !payload.narrative) {
    return buildLocalBriefing(rankedSignals);
  }

  return {
    headline: cleanText(payload.headline, "Your calm operating plan is ready"),
    narrative: cleanText(payload.narrative, "Review critical updates before entering focus mode."),
    highlights: normalizeStringArray(payload.highlights, 3),
    recommendations: normalizeStringArray(payload.recommendations, 3),
    focusPlan: normalizeStringArray(payload.focusPlan, 3),
    riskLevel: normalizePriorityLabel(payload.riskLevel, getHighestRiskLabel(rankedSignals)),
    generatedBy: "Gemini"
  };
}

export function rankSignalsLocally(signals: PriorityItem[]) {
  return signals
    .map((signal) => {
      const priority = clampPriority(signal.priority);
      const priorityLabel = signal.priorityLabel ?? getPriorityLabel(priority);
      const recommendation =
        signal.recommendation ??
        getLocalRecommendation(signal, priorityLabel);

      return {
        ...signal,
        priority,
        priorityLabel,
        aiSummary: signal.aiSummary ?? createLocalSummary(signal, priorityLabel),
        recommendation,
        hideInFocus: signal.hideInFocus ?? priority < 70,
        reasoning:
          signal.reasoning ??
          `${priorityLabel} because it affects ${signal.impact.toLowerCase()}.`,
        confidence: signal.confidence ?? Math.min(98, Math.max(62, priority + 4)),
        aiSource: signal.aiSource ?? "Local"
      } satisfies PriorityItem;
    })
    .sort(sortByPriority);
}

export function buildLocalBriefing(signals: PriorityItem[]): AIBriefing {
  const ranked = rankSignalsLocally(signals);
  const critical = ranked.filter((signal) => signal.priorityLabel === "Critical");
  const important = ranked.filter((signal) => signal.priorityLabel === "Important");
  const hidden = ranked.filter((signal) => signal.hideInFocus);
  const topSignal = ranked[0];

  if (!topSignal) {
    return {
      headline: "Connect sources to generate your first AI briefing",
      narrative:
        "Once Gmail, Calendar, or Tasks are connected, Digital Calm OS will rank updates, compress summaries, and prepare a focus-ready plan.",
      highlights: [
        "No live work signals are synced yet.",
        "Focus mode is ready to hide low-priority items.",
        "The local priority engine is standing by until Gemini is configured."
      ],
      recommendations: [
        "Connect at least one Google source.",
        "Sync the provider from the connection setup.",
        "Return to the dashboard for a live AI briefing."
      ],
      focusPlan: [
        "Connect sources",
        "Sync updates",
        "Start a protected focus block"
      ],
      riskLevel: "Low Priority",
      generatedBy: "Local"
    };
  }

  return {
    headline: critical.length
      ? `${critical.length} critical signal${critical.length === 1 ? "" : "s"} need a decision`
      : `${important.length || ranked.length} important update${important.length === 1 ? "" : "s"} surfaced`,
    narrative: `${topSignal.title} is the first item to handle. The engine found ${ranked.length} synced update${ranked.length === 1 ? "" : "s"} and can hide ${hidden.length} distraction${hidden.length === 1 ? "" : "s"} during focus mode.`,
    highlights: ranked.slice(0, 3).map((signal) => signal.aiSummary ?? signal.summary),
    recommendations: ranked
      .slice(0, 3)
      .map((signal) => signal.recommendation ?? getLocalRecommendation(signal, signal.priorityLabel ?? getPriorityLabel(signal.priority))),
    focusPlan: [
      "Handle critical replies first",
      "Defer medium and low-priority updates",
      "Start a 50-minute protected focus block"
    ],
    riskLevel: getHighestRiskLabel(ranked),
    generatedBy: "Local"
  };
}

function buildSignalRankingPrompt(signals: PriorityItem[], context: string) {
  return [
    "You are the priority engine for Digital Calm OS, a next-generation AI operating system for mental clarity.",
    "Rank emails, Slack-style notifications, calendar events, and tasks by decision urgency.",
    "Return only valid JSON. Do not include markdown.",
    "Priority labels must be exactly one of: Critical, Important, Medium, Low Priority, Distraction.",
    "Allowed actions are exactly: Reply now, Ignore, Schedule later, Delegate, Summarize.",
    "Allowed categories are exactly: urgent, deep work, noise, social, deadlines, finance, team.",
    "Decide what should be hidden in Focus Mode. Hide anything that is not useful for immediate deep work.",
    "Write premium, concise, human-like summaries. Do not invent people, dates, amounts, or facts.",
    `Context: ${context}.`,
    "JSON shape:",
    '{"items":[{"id":"string","priority":0,"priorityLabel":"Critical","summary":"string","recommendation":"string","hideInFocus":false,"action":"Reply now","impact":"string","category":"urgent","reasoning":"string","confidence":90}]}',
    "Signals:",
    JSON.stringify(signals.slice(0, 24).map(toPromptSignal))
  ].join("\n");
}

function buildBriefingPrompt(signals: PriorityItem[]) {
  return [
    "You are writing the AI Daily Briefing for Digital Calm OS.",
    "The briefing must feel premium, concise, executive, and useful. It should prioritize decisions, blockers, meetings, urgent emails, Slack activity, and important tasks.",
    "Return only valid JSON. Do not include markdown.",
    "Priority labels must be exactly one of: Critical, Important, Medium, Low Priority, Distraction.",
    "JSON shape:",
    '{"headline":"string","narrative":"string","highlights":["string"],"recommendations":["string"],"focusPlan":["string"],"riskLevel":"Important"}',
    "Use 3 highlights, 3 recommendations, and 3 focus plan steps. Do not invent facts beyond these signals.",
    "Signals:",
    JSON.stringify(signals.slice(0, 24).map(toPromptSignal))
  ].join("\n");
}

async function requestGeminiJson<T>(prompt: string, maxOutputTokens: number) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000); // 4 second timeout for Gemini

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.22,
          maxOutputTokens,
          responseMimeType: "application/json"
        }
      }),
      signal: controller.signal
    });

    const payload = (await response.json().catch(() => ({}))) as GeminiResponse & {
      error?: { message?: string };
    };

    if (!response.ok) {
      console.warn("[Digital Calm OS] Gemini request failed:", payload.error?.message ?? response.statusText);
      return null;
    }

    const text =
      payload.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("")
        .trim() ?? "";

    if (!text) {
      console.warn("[Digital Calm OS] Gemini returned an empty response.", payload.promptFeedback?.blockReason);
      return null;
    }

    return parseJson<T>(text);
  } catch (error) {
    console.warn(
      "[Digital Calm OS] Gemini processing fell back to local AI:",
      error instanceof Error ? error.message : error
    );
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function mergeGeminiDecision(signal: PriorityItem, decision?: GeminiSignalDecision) {
  if (!decision) {
    return rankSignalsLocally([signal])[0];
  }

  const priority = clampPriority(decision.priority ?? signal.priority);
  const priorityLabel = normalizePriorityLabel(decision.priorityLabel, getPriorityLabel(priority));
  const action = allowedActions.includes(decision.action as PriorityItem["action"])
    ? (decision.action as PriorityItem["action"])
    : signal.action;
  const category = allowedCategories.includes(decision.category as PriorityItem["category"])
    ? (decision.category as PriorityItem["category"])
    : signal.category;

  return {
    ...signal,
    priority,
    priorityLabel,
    summary: cleanText(decision.summary, signal.summary),
    aiSummary: cleanText(decision.summary, signal.summary),
    recommendation: cleanText(decision.recommendation, getLocalRecommendation(signal, priorityLabel)),
    hideInFocus: Boolean(decision.hideInFocus),
    action,
    impact: cleanText(decision.impact, signal.impact),
    category,
    reasoning: cleanText(decision.reasoning, `${priorityLabel} signal from ${signal.platform}.`),
    confidence: clampPriority(decision.confidence ?? priority),
    aiSource: "Gemini"
  } satisfies PriorityItem;
}

function toPromptSignal(signal: PriorityItem) {
  return {
    id: signal.id,
    platform: signal.platform,
    title: signal.title,
    sender: signal.sender,
    summary: signal.summary,
    category: signal.category,
    priority: signal.priority,
    time: signal.time,
    action: signal.action,
    impact: signal.impact
  };
}

function parseJson<T>(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? text;
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  const raw = start >= 0 && end >= start ? fenced.slice(start, end + 1) : fenced;
  return JSON.parse(raw) as T;
}

function sortByPriority(a: PriorityItem, b: PriorityItem) {
  return b.priority - a.priority;
}

function clampPriority(value: number) {
  if (!Number.isFinite(value)) return 50;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getPriorityLabel(priority: number): PriorityLabel {
  if (priority >= 88) return "Critical";
  if (priority >= 72) return "Important";
  if (priority >= 52) return "Medium";
  if (priority >= 32) return "Low Priority";
  return "Distraction";
}

function normalizePriorityLabel(value: unknown, fallback: PriorityLabel): PriorityLabel {
  return priorityLabels.includes(value as PriorityLabel) ? (value as PriorityLabel) : fallback;
}

function getHighestRiskLabel(signals: PriorityItem[]): PriorityLabel {
  const highest = signals[0]?.priority ?? 0;
  return getPriorityLabel(highest);
}

function cleanText(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length ? trimmed.slice(0, 420) : fallback;
}

function normalizeStringArray(value: unknown, targetLength: number) {
  const values = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

  return values.slice(0, targetLength).map((item) => item.trim().slice(0, 220));
}

function createLocalSummary(signal: PriorityItem, label: PriorityLabel) {
  if (label === "Critical") {
    return `${signal.title} needs attention now because it can affect ${signal.impact.toLowerCase()}.`;
  }
  if (label === "Important") {
    return `${signal.title} is worth handling before deep work or the next meeting block.`;
  }
  if (label === "Medium") {
    return `${signal.title} should stay visible, but it does not need to interrupt the current focus window.`;
  }
  if (label === "Low Priority") {
    return `${signal.title} can be batched into a later digest.`;
  }
  return `${signal.title} is safe to hide during focus mode.`;
}

function getLocalRecommendation(signal: PriorityItem, label: PriorityLabel) {
  if (label === "Critical") return `Handle ${signal.sender} before starting focus mode.`;
  if (label === "Important") return `Review this after critical work is cleared.`;
  if (label === "Medium") return `Keep it in the queue without breaking concentration.`;
  if (label === "Low Priority") return `Batch this into a later review window.`;
  return `Hide this while Focus Mode is active.`;
}

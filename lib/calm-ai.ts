import {
  dailySummary,
  focusRecommendations,
  platformSignals,
  priorityInbox,
  suggestedActions
} from "@/lib/mock-data";

const LATENCY_MS = 280;

function wait(ms = LATENCY_MS) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getPriorityBriefing() {
  await wait();

  return {
    inbox: priorityInbox,
    summary: dailySummary,
    actions: suggestedActions,
    recommendations: focusRecommendations
  };
}

export async function getIntegrationHealth() {
  await wait(180);

  return platformSignals.map((signal) => ({
    platform: signal.platform,
    connected: true,
    muted: signal.muted,
    critical: signal.critical
  }));
}

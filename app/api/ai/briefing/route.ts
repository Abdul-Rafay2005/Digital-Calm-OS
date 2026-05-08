import { NextResponse } from "next/server";
import type { PriorityItem } from "@/lib/mock-data";
import {
  buildLocalBriefing,
  generateDailyBriefingWithGemini,
  rankSignalsLocally
} from "@/lib/server/gemini-ai";
import { requireUser } from "@/lib/server/auth";

export async function POST(request: Request) {
  try {
    await requireUser();
    const body = (await request.json().catch(() => ({}))) as {
      signals?: PriorityItem[];
    };
    const signals = Array.isArray(body.signals) ? body.signals.slice(0, 40) : [];
    const rankedSignals = rankSignalsLocally(signals);
    const briefing = signals.length
      ? await generateDailyBriefingWithGemini(rankedSignals)
      : buildLocalBriefing([]);

    return NextResponse.json({
      briefing,
      rankedSignals
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI briefing failed.";
    const status = message === "Authentication required." ? 401 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

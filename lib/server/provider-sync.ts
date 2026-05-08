import "server-only";

import type { ConnectorProviderId } from "@/lib/connectors";
import { scoreSignal } from "@/lib/connectors";
import type { PriorityItem } from "@/lib/mock-data";
import { enrichSignalsWithGemini } from "@/lib/server/gemini-ai";
import type { StoredToken } from "@/lib/server/secure-store";

type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
};

export async function exchangeGoogleCode({
  clientId,
  clientSecret,
  code,
  redirectUri
}: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}): Promise<StoredToken> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    })
  });
  const payload = (await response.json()) as GoogleTokenResponse & { error_description?: string };

  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description ?? "Google OAuth token exchange failed.");
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAt: payload.expires_in
      ? new Date(Date.now() + payload.expires_in * 1000).toISOString()
      : undefined,
    scope: payload.scope,
    tokenType: payload.token_type,
    accountLabel: "Google account"
  };
}

export async function refreshGoogleAccessToken({
  clientId,
  clientSecret,
  refreshToken
}: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<StoredToken> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });
  const payload = (await response.json().catch(() => ({}))) as GoogleTokenResponse & {
    error_description?: string;
  };

  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description ?? "Google OAuth token refresh failed.");
  }

  return {
    accessToken: payload.access_token,
    refreshToken,
    expiresAt: payload.expires_in
      ? new Date(Date.now() + payload.expires_in * 1000).toISOString()
      : undefined,
    scope: payload.scope,
    tokenType: payload.token_type,
    accountLabel: "Google account"
  };
}

export async function syncProviderSignals(
  providerId: ConnectorProviderId,
  token: StoredToken
): Promise<PriorityItem[]> {
  try {
    const signals =
      providerId === "gmail"
        ? await syncGmail(token.accessToken)
        : providerId === "google-calendar"
          ? await syncGoogleCalendar(token.accessToken)
          : await syncGoogleTasks(token.accessToken);

    return enrichSignalsWithGemini(signals, `${providerId} sync`);
  } catch (error) {
    console.error(`[Provider Sync] Failed to sync ${providerId}:`, error instanceof Error ? error.message : error);
    throw error;
  }
}

async function syncGmail(accessToken: string): Promise<PriorityItem[]> {
  const list = await googleJson<{
    messages?: Array<{ id: string; threadId: string }>;
  }>(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=8&q=newer_than:7d",
    accessToken
  );

  const messages = await Promise.all(
    (list.messages ?? []).map(async (message) =>
      googleJson<{
        id: string;
        threadId: string;
        snippet?: string;
        internalDate?: string;
        payload?: { headers?: Array<{ name: string; value: string }> };
      }>(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
        accessToken
      )
    )
  );

  return messages.map((message) => {
    const headers = message.payload?.headers ?? [];
    const subject = header(headers, "Subject") || "Email synced from Gmail";
    const from = header(headers, "From") || "Gmail";
    const priority = scoreSignal(`${subject} ${message.snippet ?? ""}`, 64);

    return {
      id: `gmail-${message.id}`,
      platform: "Gmail",
      title: subject,
      sender: from,
      summary: message.snippet ?? "Gmail message synced from the connected mailbox.",
      category: priority > 84 ? "urgent" : "deep work",
      priority,
      time: "live",
      action: priority > 84 ? "Reply now" : "Summarize",
      impact: priority > 84 ? "High priority email" : "Email captured for briefing"
    } satisfies PriorityItem;
  });
}

async function syncGoogleCalendar(accessToken: string): Promise<PriorityItem[]> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const windowEnd = new Date(startOfToday);
  windowEnd.setDate(windowEnd.getDate() + 30);
  const response = await googleJson<{
    items?: Array<{ id: string; summary?: string; description?: string; start?: { dateTime?: string; date?: string } }>;
  }>(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&maxResults=10&timeMin=${encodeURIComponent(startOfToday.toISOString())}&timeMax=${encodeURIComponent(windowEnd.toISOString())}`,
    accessToken
  );

  return (response.items ?? []).map((event) => {
    const text = `${event.summary ?? "Calendar event"} ${event.description ?? ""}`;
    const priority = scoreSignal(text, 60);

    return {
      id: `calendar-${event.id}`,
      platform: "Calendar",
      title: event.summary ?? "Upcoming calendar event",
      sender: "Google Calendar",
      summary: event.description ?? `Starts ${event.start?.dateTime ?? event.start?.date ?? "soon"}.`,
      category: "deadlines",
      priority,
      time: event.start?.dateTime ?? event.start?.date ?? "upcoming",
      action: priority > 80 ? "Schedule later" : "Summarize",
      impact: "Calendar pressure synced"
    } satisfies PriorityItem;
  });
}

async function syncGoogleTasks(accessToken: string): Promise<PriorityItem[]> {
  const lists = await googleJson<{ items?: Array<{ id: string; title?: string }> }>(
    "https://tasks.googleapis.com/tasks/v1/users/@me/lists?maxResults=6",
    accessToken
  );

  const tasks = await Promise.all(
    (lists.items ?? []).slice(0, 4).map(async (list) => {
      const payload = await googleJson<{
        items?: Array<{ id: string; title?: string; notes?: string; due?: string; status?: string }>;
      }>(
        `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(list.id)}/tasks?showCompleted=false&maxResults=6`,
        accessToken
      );

      return (payload.items ?? []).map((task) => ({ ...task, listTitle: list.title ?? "Tasks" }));
    })
  );

  return tasks.flat().map((task) => {
    const text = `${task.title ?? "Task"} ${task.notes ?? ""} ${task.due ?? ""}`;
    const priority = scoreSignal(text, task.due ? 70 : 55);

    return {
      id: `tasks-${task.id}`,
      platform: "Tasks",
      title: task.title ?? "Google task",
      sender: task.listTitle,
      summary: task.notes ?? (task.due ? `Due ${task.due}` : "Task synced from Google Tasks."),
      category: task.due ? "deadlines" : "deep work",
      priority,
      time: task.due ?? "live",
      action: priority > 80 ? "Reply now" : "Summarize",
      impact: task.due ? "Deadline tracked" : "Task captured"
    } satisfies PriorityItem;
  });
}

async function googleJson<T>(url: string, accessToken: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000); // 8 second timeout per request
  
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: controller.signal
    });

    if (!response.ok) {
      const error = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
      throw new Error(error.error?.message ?? `Google API sync failed with status ${response.status}.`);
    }

    return response.json() as Promise<T>;
  } finally {
    clearTimeout(timeout);
  }
}

function header(headers: Array<{ name: string; value: string }>, name: string) {
  return headers.find((item) => item.name.toLowerCase() === name.toLowerCase())?.value;
}

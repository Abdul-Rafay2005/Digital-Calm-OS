export type ConnectorProviderId = "gmail" | "google-calendar" | "google-tasks";
export type ConnectorAccessMode = "readonly" | "action";
export type ConnectorCadence = "realtime" | "hourly" | "daily";

export type ConnectorSetupOptions = {
  accessMode: ConnectorAccessMode;
  cadence: ConnectorCadence;
  resources: string[];
  urgencyThreshold: number;
  digestOnly: boolean;
};

export type ConnectorDefinition = {
  id: ConnectorProviderId;
  name: string;
  description: string;
  authType: "oauth2";
  syncMode: "events" | "pubsub" | "polling";
  readonlyScopes: string[];
  actionScopes: string[];
  resourcesLabel: string;
  resourceOptions: string[];
  realtimeLabel: string;
  credentialEnv: string[];
};

export type ConnectorConnection = {
  id: string;
  providerId: ConnectorProviderId;
  providerName: string;
  status: "connected" | "pending_oauth" | "syncing" | "error";
  source: "oauth";
  options: ConnectorSetupOptions;
  grantedScopes: string[];
  connectedAt: string;
  lastSyncedAt: string | null;
  nextSyncAt: string;
  syncedSignals: number;
  mutedSignals: number;
};

export const connectorRegistry: ConnectorDefinition[] = [
  {
    id: "gmail",
    name: "Gmail",
    description: "Sync threads, senders, labels, commitments, and reply urgency.",
    authType: "oauth2",
    syncMode: "pubsub",
    readonlyScopes: ["https://www.googleapis.com/auth/gmail.readonly"],
    actionScopes: ["https://www.googleapis.com/auth/gmail.modify", "https://www.googleapis.com/auth/gmail.send"],
    resourcesLabel: "Labels",
    resourceOptions: ["Primary", "Investors", "Customers", "Receipts"],
    realtimeLabel: "Gmail watch + Pub/Sub",
    credentialEnv: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_PUBSUB_TOPIC"]
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Sync events, conflicts, preparation windows, and deadline pressure.",
    authType: "oauth2",
    syncMode: "pubsub",
    readonlyScopes: ["https://www.googleapis.com/auth/calendar.readonly"],
    actionScopes: ["https://www.googleapis.com/auth/calendar.events"],
    resourcesLabel: "Calendars",
    resourceOptions: ["Work", "Personal", "Team rituals", "Investor calls"],
    realtimeLabel: "Calendar channels",
    credentialEnv: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]
  },
  {
    id: "google-tasks",
    name: "Google Tasks",
    description: "Sync task lists, due dates, overdue items, and recurring commitments.",
    authType: "oauth2",
    syncMode: "polling",
    readonlyScopes: ["https://www.googleapis.com/auth/tasks.readonly"],
    actionScopes: ["https://www.googleapis.com/auth/tasks"],
    resourcesLabel: "Task lists",
    resourceOptions: ["My Tasks", "Launch", "Follow-ups", "Deep work"],
    realtimeLabel: "Incremental polling",
    credentialEnv: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]
  }
];

export function getConnector(providerId: string) {
  return connectorRegistry.find((connector) => connector.id === providerId);
}

export function resolveScopes(
  connector: ConnectorDefinition,
  accessMode: ConnectorAccessMode
) {
  return accessMode === "action"
    ? [...connector.readonlyScopes, ...connector.actionScopes]
    : connector.readonlyScopes;
}

export function createConnectionRecord(
  connector: ConnectorDefinition,
  options: ConnectorSetupOptions,
  grantedScopes: string[]
): ConnectorConnection {
  const now = new Date();
  const nextSync = new Date(now);
  nextSync.setMinutes(
    now.getMinutes() + (options.cadence === "realtime" ? 5 : options.cadence === "hourly" ? 60 : 24 * 60)
  );

  return {
    id: `${connector.id}-${now.getTime()}`,
    providerId: connector.id,
    providerName: connector.name,
    status: "connected",
    source: "oauth",
    options,
    grantedScopes,
    connectedAt: now.toISOString(),
    lastSyncedAt: now.toISOString(),
    nextSyncAt: nextSync.toISOString(),
    syncedSignals: 18 + options.resources.length * 7,
    mutedSignals: 9 + Math.round(options.urgencyThreshold / 2)
  };
}

export type ProviderCredentials = {
  googleClientId?: string;
  googleClientSecret?: string;
  googlePubsubTopic?: string;
};

export function createOAuthStartUrl(
  providerId: ConnectorProviderId,
  redirectBaseUrl: string,
  state: string,
  credentials: ProviderCredentials,
  accessMode: ConnectorAccessMode
) {
  const redirectUri = `${redirectBaseUrl}/api/connect/${providerId}/callback`;
  const connector = connectorRegistry.find((item) => item.id === providerId);
  if (!connector) return null;
  const scopes = resolveScopes(connector, accessMode);

  const clientId = credentials.googleClientId ?? process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return null;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes.join(" "),
    access_type: "offline",
    prompt: "consent",
    state
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function scoreSignal(text: string, fallback = 62) {
  const value = text.toLowerCase();
  const urgentTerms = ["urgent", "blocked", "blocker", "asap", "deadline", "risk", "incident", "today"];
  const mediumTerms = ["review", "follow up", "meeting", "due", "reply", "decision"];
  let score = fallback;

  urgentTerms.forEach((term) => {
    if (value.includes(term)) score += 8;
  });
  mediumTerms.forEach((term) => {
    if (value.includes(term)) score += 4;
  });

  return Math.min(score, 98);
}

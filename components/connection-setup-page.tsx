"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Inbox,
  KeyRound,
  Loader2,
  Mail,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X
} from "lucide-react";
import { AmbientBackground } from "@/components/ambient-background";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  connectorRegistry,
  type ConnectorConnection,
  type ConnectorProviderId,
  type ConnectorSetupOptions,
  type ProviderCredentials
} from "@/lib/connectors";
import { cn } from "@/lib/utils";

const setupPlatforms: Array<{
  id: ConnectorProviderId;
  name: string;
  description: string;
  icon: typeof Mail;
  signal: string;
}> = [
  {
    id: "gmail",
    name: "Gmail",
    description: "Summarize urgent emails, sender intent, and reply windows.",
    icon: Mail,
    signal: "Email intelligence"
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Detect meetings, overloaded days, conflicts, and preparation gaps.",
    icon: CalendarDays,
    signal: "Schedule awareness"
  },
  {
    id: "google-tasks",
    name: "Google Tasks",
    description: "Prioritize due dates, overdue work, and deep-work task blocks.",
    icon: Inbox,
    signal: "Task clarity"
  }
];

const defaultOptions: ConnectorSetupOptions = {
  accessMode: "readonly",
  cadence: "realtime",
  digestOnly: false,
  resources: ["Primary"],
  urgencyThreshold: 72
};

export function ConnectionSetupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<Partial<Record<ConnectorProviderId, ConnectorConnection>>>({});
  const [credentialStatus, setCredentialStatus] = useState({ google: false });
  const [credentials, setCredentials] = useState<ProviderCredentials>({});
  const [selectedProvider, setSelectedProvider] = useState<ConnectorProviderId | null>(null);
  const [loadingPlatform, setLoadingPlatform] = useState<ConnectorProviderId | null>(null);
  const [syncingPlatform, setSyncingPlatform] = useState<ConnectorProviderId | null>(null);
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    "Connect Google sources with your OAuth app credentials."
  );

  useEffect(() => {
    const loadState = async () => {
      const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
      const sessionPayload = (await sessionResponse.json()) as { user?: unknown };
      if (!sessionPayload.user) {
        router.push("/auth");
        return;
      }

      const [connectionsResponse, credentialsResponse] = await Promise.all([
        fetch("/api/connections", { cache: "no-store" }),
        fetch("/api/provider-credentials", { cache: "no-store" })
      ]);
      const connectionsPayload = (await connectionsResponse.json()) as {
        connections?: Partial<Record<ConnectorProviderId, ConnectorConnection>>;
      };
      const credentialsPayload = (await credentialsResponse.json()) as {
        configured?: { google: boolean };
      };

      setConnections(connectionsPayload.connections ?? {});
      setCredentialStatus({ google: Boolean(credentialsPayload.configured?.google) });
    };

    void loadState();
  }, [router, searchParams]);

  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("connector_error");

    const timer = window.setTimeout(() => {
      if (connected) setStatusMessage(`${connected} connected. Continue or connect another source.`);
      if (error) setStatusMessage(decodeURIComponent(error));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [searchParams]);

  const connectedCount = Object.keys(connections).length;
  const progress = useMemo(
    () => Math.round((connectedCount / setupPlatforms.length) * 100),
    [connectedCount]
  );

  const saveCredentials = async () => {
    setSavingCredentials(true);
    const response = await fetch("/api/provider-credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials)
    });
    const payload = (await response.json()) as {
      configured?: { google: boolean };
      error?: string;
    };

    setSavingCredentials(false);
    if (!response.ok) {
      setStatusMessage(payload.error ?? "Failed to save Google OAuth credentials.");
      return false;
    }

    setCredentialStatus({ google: Boolean(payload.configured?.google) });
    setStatusMessage("Google OAuth credentials saved securely in Postgres.");
    return true;
  };

  const connectPlatform = async (id: ConnectorProviderId) => {
    setLoadingPlatform(id);
    const hasCredentials = credentialStatus.google || (await saveCredentials());

    if (!hasCredentials) {
      setLoadingPlatform(null);
      return;
    }

    const connector = connectorRegistry.find((item) => item.id === id);
    const response = await fetch(`/api/connect/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        options: {
          ...defaultOptions,
          cadence: id === "google-tasks" ? "hourly" : "realtime",
          resources: connector?.resourceOptions.slice(0, 2) ?? []
        }
      })
    });
    const payload = (await response.json()) as { oauthUrl?: string; error?: string };

    setLoadingPlatform(null);
    if (!response.ok || !payload.oauthUrl) {
      setStatusMessage(payload.error ?? "Unable to start Google OAuth.");
      return;
    }

    window.location.assign(payload.oauthUrl);
  };

  const syncPlatform = async (id: ConnectorProviderId) => {
    setSyncingPlatform(id);
    const platform = setupPlatforms.find((item) => item.id === id);
    setStatusMessage(`Syncing ${platform?.name ?? "source"} now...`);

    const response = await fetch(`/api/sync/${id}`, { method: "POST" });
    const payload = (await response.json().catch(() => ({}))) as {
      count?: number;
      syncedAt?: string;
      error?: string;
      fix?: string;
    };

    setSyncingPlatform(null);

    if (!response.ok) {
      setStatusMessage([payload.error ?? "Sync failed.", payload.fix].filter(Boolean).join(" "));
      return;
    }

    setConnections((current) => {
      const connection = current[id];
      if (!connection) return current;

      return {
        ...current,
        [id]: {
          ...connection,
          lastSyncedAt: payload.syncedAt ?? new Date().toISOString(),
          syncedSignals: payload.count ?? connection.syncedSignals
        }
      };
    });
    setStatusMessage(`${platform?.name ?? "Source"} synced ${payload.count ?? 0} signal${payload.count === 1 ? "" : "s"}.`);
  };

  const skipForNow = () => router.push("/dashboard");

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-10 text-white sm:px-6 lg:px-8">
      <AmbientBackground />
      <div className="calm-grid fixed inset-0 z-0 opacity-45" aria-hidden="true" />
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] max-w-7xl flex-col">
        <header className="flex items-center justify-between">
          <Link className="flex items-center gap-3" href="/">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-calm-mint/25 bg-calm-mint/10 text-calm-mint">
              <Sparkles className="h-5 w-5" />
            </span>
            <span className="font-display text-sm font-semibold">Digital Calm OS</span>
          </Link>
          <Button onClick={skipForNow} variant="ghost">
            Continue to Dashboard
          </Button>
        </header>

        <section className="grid flex-1 gap-8 py-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-center">
          <motion.div animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 18 }}>
            <Badge variant="mint">
              <ShieldCheck className="h-3 w-3" />
              Production connection setup
            </Badge>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-tight tracking-normal sm:text-6xl">
              Connect with real Google OAuth credentials.
            </h1>
            <p className="mt-5 text-base leading-8 text-white/62">
              Credentials and connected provider metadata are saved to Postgres,
              ready for Neon hosting. Each Connect button starts real Google OAuth.
            </p>
            <div className="quiet-card mt-8 rounded-2xl p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/58">Onboarding progress</span>
                <span className="font-display text-2xl font-semibold text-calm-mint">
                  {progress}%
                </span>
              </div>
              <Progress className="mt-3" value={progress} tone="mint" />
              <p className="mt-3 text-xs leading-5 text-white/48">{statusMessage}</p>
            </div>
            <GoogleCredentialsCard
              credentials={credentials}
              credentialStatus={credentialStatus.google}
              onChange={setCredentials}
              onSave={saveCredentials}
              saving={savingCredentials}
            />
          </motion.div>

          <div className="grid gap-4">
            {setupPlatforms.map((platform, index) => (
              <ConnectionCard
                connected={Boolean(connections[platform.id])}
                connection={connections[platform.id]}
                index={index}
                key={platform.id}
                loading={loadingPlatform === platform.id}
                onConnect={() => {
                  setSelectedProvider(platform.id);
                  if (credentialStatus.google) {
                    void connectPlatform(platform.id);
                  }
                }}
                onStartOAuth={() => connectPlatform(platform.id)}
                onSync={() => syncPlatform(platform.id)}
                platform={platform}
                selected={selectedProvider === platform.id}
                syncing={syncingPlatform === platform.id}
              />
            ))}
          </div>
        </section>

        
      </div>
    </main>
  );
}

function GoogleCredentialsCard({
  credentialStatus,
  credentials,
  onChange,
  onSave,
  saving
}: {
  credentialStatus: boolean;
  credentials: ProviderCredentials;
  onChange: (credentials: ProviderCredentials) => void;
  onSave: () => Promise<boolean>;
  saving: boolean;
}) {
  return (
    <div className="quiet-card mt-5 rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Google OAuth App</h2>
          <p className="mt-1 text-sm leading-6 text-white/52">
            Required for Gmail, Calendar, and Tasks OAuth.
          </p>
        </div>
        <Badge variant={credentialStatus ? "mint" : "default"}>
          {credentialStatus ? "Saved" : "Required"}
        </Badge>
      </div>
      <div className="mt-5 grid gap-3">
        <CredentialInput
          label="Google Client ID"
          onChange={(value) => onChange({ ...credentials, googleClientId: value })}
          placeholder="client-id.apps.googleusercontent.com"
          value={credentials.googleClientId ?? ""}
        />
        <CredentialInput
          label="Google Client Secret"
          onChange={(value) => onChange({ ...credentials, googleClientSecret: value })}
          placeholder="Stored encrypted in Postgres"
          secret
          value={credentials.googleClientSecret ?? ""}
        />
        <CredentialInput
          label="Google Pub/Sub Topic"
          onChange={(value) => onChange({ ...credentials, googlePubsubTopic: value })}
          placeholder="projects/project-id/topics/gmail-watch"
          value={credentials.googlePubsubTopic ?? ""}
        />
      </div>
      <Button className="mt-5 w-full" disabled={saving} onClick={() => void onSave()} variant="signal">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
        Save Google credentials
      </Button>
    </div>
  );
}

function ConnectionCard({
  connected,
  connection,
  index,
  loading,
  onConnect,
  onStartOAuth,
  onSync,
  platform,
  selected,
  syncing
}: {
  connected: boolean;
  connection?: ConnectorConnection;
  index: number;
  loading: boolean;
  onConnect: () => void;
  onStartOAuth: () => Promise<void>;
  onSync: () => Promise<void>;
  platform: (typeof setupPlatforms)[number];
  selected: boolean;
  syncing: boolean;
}) {
  const Icon = platform.icon;

  return (
    <motion.article
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group relative overflow-hidden rounded-[1.5rem] border p-5 backdrop-blur-2xl transition",
        connected
          ? "border-calm-mint/30 bg-calm-mint/10 shadow-[0_0_50px_rgba(120,255,214,0.08)]"
          : selected
            ? "border-calm-cyan/30 bg-calm-cyan/10"
            : "border-white/10 bg-white/[0.05] hover:border-white/18 hover:bg-white/[0.075]"
      )}
      initial={{ opacity: 0, y: 18 }}
      transition={{ delay: index * 0.08 }}
      whileHover={{ y: -3 }}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-calm-mint/55 to-transparent opacity-0 transition group-hover:opacity-100" />
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/22 text-calm-mint">
            <Icon className="h-6 w-6" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-xl font-semibold">{platform.name}</h2>
              <Badge variant={connected ? "mint" : "cyan"}>{platform.signal}</Badge>
            </div>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/58">
              {platform.description}
            </p>
            {connected ? (
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/45">
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                  Last sync: {formatSyncTime(connection?.lastSyncedAt)}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                  Signals: {connection?.syncedSignals ?? 0}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {connected ? (
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col gap-2 sm:items-end"
              exit={{ opacity: 0, scale: 0.96 }}
              initial={{ opacity: 0, scale: 0.96 }}
              key="connected"
            >
              <div className="flex items-center gap-3 rounded-full border border-calm-mint/25 bg-calm-mint/10 px-4 py-2 text-sm text-calm-mint">
                <CheckCircle2 className="h-4 w-4" />
                Connected
              </div>
              <Button disabled={syncing} onClick={() => void onSync()} size="sm" variant="calm">
                {syncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Sync now
              </Button>
            </motion.div>
          ) : (
            <div className="flex flex-col gap-2 sm:items-end">
              <Button disabled={loading} key="connect" onClick={onConnect} variant="signal">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Connect
              </Button>
              {selected ? (
                <Button disabled={loading} onClick={() => void onStartOAuth()} size="sm" variant="calm">
                  Start OAuth
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              ) : null}
            </div>
          )}
        </AnimatePresence>
      </div>
    </motion.article>
  );
}

function formatSyncTime(value: string | null | undefined) {
  if (!value) return "Never";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function CredentialInput({
  label,
  onChange,
  placeholder,
  secret = false,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  secret?: boolean;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-[0.18em] text-white/42">
        {label}
      </span>
      <div className="relative mt-2">
        <input
          className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 pr-10 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-calm-mint/35 focus:bg-white/[0.07]"
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type={secret ? "password" : "text"}
          value={value}
        />
        {value ? (
          <button
            aria-label={`Clear ${label}`}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/38 hover:text-white"
            onClick={() => onChange("")}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </label>
  );
}

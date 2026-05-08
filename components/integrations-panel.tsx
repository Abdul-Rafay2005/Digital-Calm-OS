"use client";

import type { ComponentType, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Inbox,
  KeyRound,
  Loader2,
  Mail,
  RefreshCw,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Unplug
} from "lucide-react";
import {
  connectorRegistry,
  type ConnectorAccessMode,
  type ConnectorCadence,
  type ConnectorConnection,
  type ConnectorProviderId,
  type ConnectorSetupOptions,
  type ProviderCredentials
} from "@/lib/connectors";
import type { PriorityItem } from "@/lib/mock-data";
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
import { cn } from "@/lib/utils";

type IntegrationsPanelProps = {
  onSignalsSynced: (signals: PriorityItem[]) => void;
};

const providerIcons = {
  gmail: Mail,
  "google-calendar": CalendarDays,
  "google-tasks": Inbox
};

function createDefaultOptions(providerId: ConnectorProviderId): ConnectorSetupOptions {
  const connector = connectorRegistry.find((item) => item.id === providerId);

  return {
    accessMode: "readonly",
    cadence: providerId === "google-tasks" ? "hourly" : "realtime",
    resources: connector?.resourceOptions.slice(0, 2) ?? [],
    urgencyThreshold: 72,
    digestOnly: false
  };
}

export function IntegrationsPanel({ onSignalsSynced }: IntegrationsPanelProps) {
  const [selectedProvider, setSelectedProvider] = useState<ConnectorProviderId>("gmail");
  const [optionsByProvider, setOptionsByProvider] = useState(() =>
    connectorRegistry.reduce(
      (acc, connector) => ({
        ...acc,
        [connector.id]: createDefaultOptions(connector.id)
      }),
      {} as Record<ConnectorProviderId, ConnectorSetupOptions>
    )
  );
  const [connections, setConnections] = useState<Partial<Record<ConnectorProviderId, ConnectorConnection>>>(
    {}
  );
  const [credentials, setCredentials] = useState<ProviderCredentials>({});
  const [credentialStatus, setCredentialStatus] = useState({ google: false });
  const [busyProvider, setBusyProvider] = useState<ConnectorProviderId | null>(null);
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    "Add provider OAuth credentials, choose sync options, then connect."
  );

  const selectedConnector = useMemo(
    () => connectorRegistry.find((connector) => connector.id === selectedProvider) ?? connectorRegistry[0],
    [selectedProvider]
  );
  const selectedOptions = optionsByProvider[selectedProvider];
  const connectedCount = Object.keys(connections).length;

  useEffect(() => {
    const loadServerState = async () => {
      const [credentialResponse, connectionResponse] = await Promise.all([
        fetch("/api/provider-credentials", { cache: "no-store" }),
        fetch("/api/connections", { cache: "no-store" })
      ]);
      const credentialPayload = (await credentialResponse.json()) as {
        configured?: { google: boolean };
      };
      const connectionPayload = (await connectionResponse.json()) as {
        connections?: Partial<Record<ConnectorProviderId, ConnectorConnection>>;
      };

      setCredentialStatus({
        google: Boolean(credentialPayload.configured?.google)
      });
      setConnections(connectionPayload.connections ?? {});
    };

    void loadServerState();
  }, []);

  const updateOptions = (nextOptions: Partial<ConnectorSetupOptions>) => {
    setOptionsByProvider((current) => ({
      ...current,
      [selectedProvider]: {
        ...current[selectedProvider],
        ...nextOptions
      }
    }));
  };

  const toggleResource = (resource: string) => {
    const currentResources = selectedOptions.resources;
    const resources = currentResources.includes(resource)
      ? currentResources.filter((item) => item !== resource)
      : [...currentResources, resource];

    updateOptions({ resources });
  };

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

    setCredentialStatus({
      google: Boolean(payload.configured?.google)
    });
    setStatusMessage(
      response.ok
        ? "OAuth credentials saved in the encrypted server cookie vault."
        : payload.error ?? "Credential save failed."
    );
    setSavingCredentials(false);
  };

  const connectProvider = async () => {
    setBusyProvider(selectedProvider);
    setStatusMessage(`Opening secure ${selectedConnector.name} authorization...`);

    const response = await fetch(`/api/connect/${selectedProvider}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        options: selectedOptions
      })
    });
    const payload = (await response.json()) as {
      oauthUrl?: string;
      message?: string;
      error?: string;
    };

    if (!response.ok || !payload.oauthUrl) {
      setStatusMessage(payload.error ?? "Connection failed.");
      setBusyProvider(null);
      return;
    }

    setStatusMessage(payload.message ?? `Redirecting to ${selectedConnector.name} OAuth...`);
    window.location.href = payload.oauthUrl;
    setBusyProvider(null);
  };

  const syncProvider = async (providerId: ConnectorProviderId) => {
    setBusyProvider(providerId);
    const connector = connectorRegistry.find((item) => item.id === providerId);
    setStatusMessage(`Syncing ${connector?.name ?? "provider"} signals...`);

    const response = await fetch(`/api/sync/${providerId}`, { method: "POST" });
    const payload = (await response.json()) as {
      signals?: PriorityItem[];
      syncedAt?: string;
      error?: string;
      fix?: string;
    };

    if (!response.ok || !payload.signals) {
      setStatusMessage([payload.error ?? "Sync failed.", payload.fix].filter(Boolean).join(" "));
      setBusyProvider(null);
      return;
    }

    const connection = connections[providerId];
    if (connection) {
      setConnections({
        ...connections,
        [providerId]: {
          ...connection,
          lastSyncedAt: payload.syncedAt ?? new Date().toISOString(),
          syncedSignals: connection.syncedSignals + payload.signals.length
        }
      });
    }

    onSignalsSynced(payload.signals);
    setStatusMessage(`${connector?.name ?? "Provider"} synced ${payload.signals.length} priority signal.`);
    setBusyProvider(null);
  };

  const disconnectProvider = (providerId: ConnectorProviderId) => {
    const nextConnections = { ...connections };
    delete nextConnections[providerId];
    setConnections(nextConnections);
    void fetch(`/api/connections?provider=${providerId}`, { method: "DELETE" });
    setStatusMessage("Connector removed and stored tokens deleted from the vault.");
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8" id="integrations">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <Badge variant="mint">
            <KeyRound className="h-3 w-3" />
            Dynamic connectors
          </Badge>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-normal sm:text-5xl">
            Connect your work graph in a few calm choices.
          </h2>
          <p className="mt-5 text-base leading-8 text-white/62">
            Pick sources, choose read-only or action permissions, set sync cadence,
            and let Calm OS normalize everything into one priority model.
          </p>
        </div>
        <div className="quiet-card w-full rounded-2xl p-4 lg:max-w-sm">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/58">Connector readiness</span>
            <span className="font-display text-2xl font-semibold text-calm-mint">
              {connectedCount}/3
            </span>
          </div>
          <Progress className="mt-3" value={connectedCount * 25} tone="mint" />
          <p className="mt-3 text-xs leading-5 text-white/48">{statusMessage}</p>
        </div>
      </div>

      <Card className="mb-5 rounded-[1.75rem]">
        <CardHeader className="border-b border-white/10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Provider OAuth Credentials</CardTitle>
              <CardDescription>
                Enter OAuth app credentials, not personal account passwords. Account access happens through provider consent screens.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge variant={credentialStatus.google ? "mint" : "default"}>Google</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 p-5 lg:grid-cols-2">
          <CredentialField
            label="Google Client ID"
            onChange={(value) => setCredentials((current) => ({ ...current, googleClientId: value }))}
            placeholder="client-id.apps.googleusercontent.com"
            value={credentials.googleClientId ?? ""}
          />
          <CredentialField
            label="Google Client Secret"
            onChange={(value) =>
              setCredentials((current) => ({ ...current, googleClientSecret: value }))
            }
            placeholder="Stored encrypted server-side"
            secret
            value={credentials.googleClientSecret ?? ""}
          />
          <div className="lg:col-span-2">
            <CredentialField
              label="Google Pub/Sub Topic"
              onChange={(value) =>
                setCredentials((current) => ({ ...current, googlePubsubTopic: value }))
              }
              placeholder="projects/project-id/topics/gmail-watch"
              value={credentials.googlePubsubTopic ?? ""}
            />
          </div>
          <div className="flex flex-col gap-3 lg:col-span-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-white/45">
              Redirect URIs: `/api/connect/gmail/callback`, `/api/connect/google-calendar/callback`,
              and `/api/connect/google-tasks/callback`.
            </p>
            <Button disabled={savingCredentials} onClick={saveCredentials} variant="signal">
              {savingCredentials ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              Save credentials
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[0.86fr_1.14fr]">
        <Card className="rounded-[1.75rem]">
          <CardHeader>
            <CardTitle>Available Sources</CardTitle>
            <CardDescription>Each connector uses OAuth-style permissions and a provider-specific sync mode.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {connectorRegistry.map((connector) => {
              const Icon = providerIcons[connector.id];
              const isSelected = selectedProvider === connector.id;
              const connection = connections[connector.id];
              const isBusy = busyProvider === connector.id;

              return (
                <button
                  className={cn(
                    "group w-full rounded-2xl border p-4 text-left transition",
                    isSelected
                      ? "border-calm-mint/28 bg-calm-mint/10"
                      : "border-white/9 bg-white/[0.04] hover:border-white/16 hover:bg-white/[0.06]"
                  )}
                  key={connector.id}
                  onClick={() => setSelectedProvider(connector.id)}
                >
                  <div className="flex items-start gap-4">
                    <span
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border",
                        isSelected
                          ? "border-calm-mint/25 bg-calm-mint/10 text-calm-mint"
                          : "border-white/10 bg-black/22 text-white/54"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-base font-semibold text-white">
                          {connector.name}
                        </span>
                        <Badge variant={connection ? "mint" : "default"}>
                          {connection ? "Connected" : connector.realtimeLabel}
                        </Badge>
                      </span>
                      <span className="mt-1 block text-sm leading-6 text-white/56">
                        {connector.description}
                      </span>
                      {connection ? (
                        <span className="mt-2 block truncate text-xs text-white/38">
                          Scopes: {connection.grantedScopes.join(", ") || "none"}
                        </span>
                      ) : null}
                    </span>
                    {isBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin text-calm-mint" />
                    ) : connection ? (
                      <CheckCircle2 className="h-4 w-4 text-calm-mint" />
                    ) : null}
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem]">
          <CardHeader className="border-b border-white/10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>{selectedConnector.name} Setup</CardTitle>
                <CardDescription>
                  Configure what Calm OS can see, how often it syncs, and what counts as important.
                </CardDescription>
              </div>
              <Badge variant="cyan">
                <ShieldCheck className="h-3 w-3" />
                OAuth 2.0
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid gap-5 xl:grid-cols-[1fr_0.95fr]">
              <div className="space-y-5">
                <OptionBlock icon={ShieldCheck} title="Permission mode">
                  <SegmentedControl
                    options={[
                      ["readonly", "Read-only"],
                      ["action", "Action mode"]
                    ]}
                    value={selectedOptions.accessMode}
                    onChange={(value) => updateOptions({ accessMode: value as ConnectorAccessMode })}
                  />
                </OptionBlock>

                <OptionBlock icon={Clock3} title="Sync cadence">
                  <SegmentedControl
                    options={[
                      ["realtime", "Live"],
                      ["hourly", "Hourly"],
                      ["daily", "Digest"]
                    ]}
                    value={selectedOptions.cadence}
                    onChange={(value) => updateOptions({ cadence: value as ConnectorCadence })}
                  />
                </OptionBlock>

                <OptionBlock icon={SlidersHorizontal} title="Urgency threshold">
                  <input
                    aria-label="Urgency threshold"
                    className="w-full accent-calm-mint"
                    max={95}
                    min={40}
                    onChange={(event) =>
                      updateOptions({ urgencyThreshold: Number(event.target.value) })
                    }
                    type="range"
                    value={selectedOptions.urgencyThreshold}
                  />
                  <div className="mt-2 flex items-center justify-between text-xs text-white/45">
                    <span>More context</span>
                    <span className="text-calm-mint">{selectedOptions.urgencyThreshold}% priority</span>
                    <span>Less noise</span>
                  </div>
                </OptionBlock>

                <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/9 bg-white/[0.04] p-4">
                  <span>
                    <span className="block text-sm font-medium text-white">Digest-only low priority items</span>
                    <span className="mt-1 block text-xs leading-5 text-white/46">
                      Keep noisy updates out of the live inbox.
                    </span>
                  </span>
                  <input
                    checked={selectedOptions.digestOnly}
                    className="h-5 w-5 accent-calm-mint"
                    onChange={(event) => updateOptions({ digestOnly: event.target.checked })}
                    type="checkbox"
                  />
                </label>
              </div>

              <div className="space-y-5">
                <OptionBlock icon={Settings2} title={selectedConnector.resourcesLabel}>
                  <div className="flex flex-wrap gap-2">
                    {selectedConnector.resourceOptions.map((resource) => (
                      <button
                        className={cn(
                          "rounded-full border px-3 py-2 text-sm transition",
                          selectedOptions.resources.includes(resource)
                            ? "border-calm-mint/30 bg-calm-mint/10 text-calm-mint"
                            : "border-white/10 bg-white/[0.04] text-white/58 hover:text-white"
                        )}
                        key={resource}
                        onClick={() => toggleResource(resource)}
                      >
                        {resource}
                      </button>
                    ))}
                  </div>
                </OptionBlock>

                <div className="rounded-2xl border border-white/9 bg-black/20 p-4">
                  <div className="text-xs font-medium uppercase tracking-[0.2em] text-white/42">
                    Granted scopes
                  </div>
                  <div className="mt-3 space-y-2">
                    {(selectedOptions.accessMode === "action"
                      ? [...selectedConnector.readonlyScopes, ...selectedConnector.actionScopes]
                      : selectedConnector.readonlyScopes
                    ).map((scope) => (
                      <div className="truncate rounded-xl bg-white/[0.04] px-3 py-2 text-xs text-white/58" key={scope}>
                        {scope}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    disabled={busyProvider === selectedProvider}
                    onClick={connectProvider}
                    variant="signal"
                  >
                    {busyProvider === selectedProvider ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <KeyRound className="h-4 w-4" />
                    )}
                    Connect
                  </Button>
                  <Button
                    disabled={!connections[selectedProvider] || busyProvider === selectedProvider}
                    onClick={() => syncProvider(selectedProvider)}
                    variant="calm"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Sync now
                  </Button>
                </div>

                {connections[selectedProvider] ? (
                  <Button
                    className="w-full"
                    onClick={() => disconnectProvider(selectedProvider)}
                    variant="danger"
                  >
                    <Unplug className="h-4 w-4" />
                    Disconnect {selectedConnector.name}
                  </Button>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {connectedCount ? (
        <motion.div
          className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          {Object.values(connections).map((connection) => (
            <div className="quiet-card rounded-2xl p-4" key={connection.id}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-display text-base font-semibold">{connection.providerName}</div>
                  <div className="mt-1 text-xs text-white/45">
                    OAuth connected
                  </div>
                </div>
                <Sparkles className="h-5 w-5 text-calm-mint" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-white/[0.04] p-3">
                  <div className="text-white/42">Synced</div>
                  <div className="mt-1 font-display text-xl font-semibold">{connection.syncedSignals}</div>
                </div>
                <div className="rounded-xl bg-white/[0.04] p-3">
                  <div className="text-white/42">Muted</div>
                  <div className="mt-1 font-display text-xl font-semibold">{connection.mutedSignals}</div>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      ) : null}
    </section>
  );
}

function OptionBlock({
  children,
  icon: Icon,
  title
}: {
  children: ReactNode;
  icon: ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="rounded-2xl border border-white/9 bg-white/[0.04] p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
        <Icon className="h-4 w-4 text-calm-mint" />
        {title}
      </div>
      {children}
    </div>
  );
}

function CredentialField({
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
      <input
        className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-calm-mint/35 focus:bg-white/[0.07]"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={secret ? "password" : "text"}
        value={value}
      />
    </label>
  );
}

function SegmentedControl({
  onChange,
  options,
  value
}: {
  onChange: (value: string) => void;
  options: Array<[string, string]>;
  value: string;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map(([optionValue, label]) => (
        <button
          className={cn(
            "rounded-xl border px-3 py-2 text-sm transition",
            value === optionValue
              ? "border-calm-mint/30 bg-calm-mint/10 text-calm-mint"
              : "border-white/10 bg-white/[0.04] text-white/58 hover:text-white"
          )}
          key={optionValue}
          onClick={() => onChange(optionValue)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

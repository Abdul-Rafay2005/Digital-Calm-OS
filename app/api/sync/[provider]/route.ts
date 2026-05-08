import { NextResponse } from "next/server";
import { getConnector } from "@/lib/connectors";
import { refreshGoogleAccessToken, syncProviderSignals } from "@/lib/server/provider-sync";
import { requireUser } from "@/lib/server/auth";
import {
  readProviderCredentials,
  readProviderToken,
  updateProviderAccessToken,
  updateConnectionSyncStats
} from "@/lib/server/provider-vault";
import type { StoredToken } from "@/lib/server/secure-store";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;
    const user = await requireUser();
    const connector = getConnector(provider);

    if (!connector) {
      return NextResponse.json({ error: "Unknown connector provider." }, { status: 404 });
    }

    const token = await readProviderToken(user.id, connector.id);

    if (!token) {
      return NextResponse.json(
        { error: `${connector.name} is not connected. Complete OAuth first.` },
        { status: 401 }
      );
    }

    const activeToken = await refreshTokenIfNeeded(user.id, connector.id, token);
    const signals = await syncWithAuthRetry({
      providerId: connector.id,
      token: activeToken,
      userId: user.id
    });
    await updateConnectionSyncStats({
      userId: user.id,
      providerId: connector.id,
      syncedSignals: signals.length,
      mutedSignals: Math.max(
        0,
        signals.filter((signal) => signal.hideInFocus ?? signal.priority < 70).length
      )
    });

    return NextResponse.json({
      provider: connector.name,
      syncedAt: new Date().toISOString(),
      count: signals.length,
      signals
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed.";
    const status = message.includes("insufficient") || message.includes("scope") ? 403 : 500;

    return NextResponse.json(
      {
        error: message,
        fix:
          status === 403
            ? "Google token is missing a required scope. Reconnect the provider after updating OAuth consent scopes."
            : "Check provider credentials, token validity, and provider API access."
      },
      { status }
    );
  }
}

async function syncWithAuthRetry({
  providerId,
  token,
  userId
}: {
  providerId: NonNullable<ReturnType<typeof getConnector>>["id"];
  token: StoredToken;
  userId: string;
}) {
  try {
    return await syncProviderSignals(providerId, token);
  } catch (error) {
    if (!isGoogleAuthError(error) || !token.refreshToken) {
      throw error;
    }

    const refreshed = await refreshAndPersistGoogleToken(userId, providerId, token.refreshToken);
    return syncProviderSignals(providerId, refreshed);
  }
}

async function refreshTokenIfNeeded(
  userId: string,
  providerId: NonNullable<ReturnType<typeof getConnector>>["id"],
  token: StoredToken
) {
  if (!token.refreshToken || !token.expiresAt) return token;

  const expiresInMs = new Date(token.expiresAt).getTime() - Date.now();
  if (expiresInMs > 60_000) return token;

  return refreshAndPersistGoogleToken(userId, providerId, token.refreshToken);
}

async function refreshAndPersistGoogleToken(
  userId: string,
  providerId: NonNullable<ReturnType<typeof getConnector>>["id"],
  refreshToken: string
) {
  const credentials = await readProviderCredentials(userId);
  if (!credentials.googleClientId || !credentials.googleClientSecret) {
    throw new Error("Google OAuth credentials are missing. Save Google Client ID and Client Secret again.");
  }

  const refreshed = await refreshGoogleAccessToken({
    clientId: credentials.googleClientId,
    clientSecret: credentials.googleClientSecret,
    refreshToken
  });

  await updateProviderAccessToken({
    userId,
    providerId,
    accessToken: refreshed.accessToken,
    expiresAt: refreshed.expiresAt,
    scope: refreshed.scope,
    tokenType: refreshed.tokenType
  });

  return refreshed;
}

function isGoogleAuthError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("invalid authentication credentials") ||
    message.includes("access token") ||
    message.includes("unauthorized") ||
    message.includes("status 401") ||
    message.includes("auth error")
  );
}

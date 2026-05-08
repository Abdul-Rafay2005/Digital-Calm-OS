import { NextResponse } from "next/server";
import { getConnector } from "@/lib/connectors";
import { refreshGoogleAccessToken, syncProviderSignals } from "@/lib/server/provider-sync";
import { requireUser } from "@/lib/server/auth";
import {
  readProviderCredentials,
  readProviderToken,
  updateProviderAccessToken,
  updateConnectionSyncStats,
  deleteProviderToken
} from "@/lib/server/provider-vault";
import type { StoredToken } from "@/lib/server/secure-store";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  let provider = "unknown";
  try {
    const resolvedParams = await params;
    provider = resolvedParams.provider;
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
    const status = message.includes("insufficient") || message.includes("scope") ? 403 
                  : message.includes("access has expired") || message.includes("not connected") ? 401 
                  : 500;
    
    // Log detailed error for debugging
    console.error(`[Sync Error] ${provider} sync failed:`, {
      message,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(
      {
        error: message,
        fix:
          status === 403
            ? "Google token is missing a required scope. Reconnect the provider after updating OAuth consent scopes."
            : status === 401
            ? "Provider access has expired. Please reconnect this provider in the dashboard."
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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000); // 25 second timeout for entire sync

  try {
    return await Promise.race([
      syncProviderSignals(providerId, token),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Sync timeout for ${providerId}`)), 23000)
      )
    ]);
  } catch (error) {
    // Check if refresh token is expired/revoked - clear tokens and require reconnection
    if (isRefreshTokenExpiredError(error)) {
      console.warn(`[Sync Error] Refresh token expired for ${providerId}, clearing tokens for user ${userId}`);
      await deleteProviderToken(userId, providerId);
      const connector = getConnector(providerId);
      throw new Error(`${connector?.name ?? providerId} access has expired. Please reconnect this provider.`);
    }

    if (!isGoogleAuthError(error) || !token.refreshToken) {
      throw error;
    }

    const refreshed = await refreshAndPersistGoogleToken(userId, providerId, token.refreshToken);
    try {
      return await Promise.race([
        syncProviderSignals(providerId, refreshed),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Sync timeout for ${providerId} (retry)`)), 18000)
        )
      ]);
    } finally {
      clearTimeout(timeout);
    }
  }
}

async function refreshTokenIfNeeded(
  userId: string,
  providerId: NonNullable<ReturnType<typeof getConnector>>["id"],
  token: StoredToken
) {
  if (!token.refreshToken || !token.expiresAt) {
    console.log(`[Token Check] ${providerId}: No refresh token or expiresAt available`);
    return token;
  }

  const expiresInMs = new Date(token.expiresAt).getTime() - Date.now();
  const expiresInMinutes = Math.round(expiresInMs / 60000);

  console.log(`[Token Check] ${providerId}: Token expires in ${expiresInMinutes} minutes`);

  // Refresh if token expires in less than 5 minutes (300 seconds)
  // This gives plenty of buffer for sync operations that might take time
  if (expiresInMs > 300_000) return token;

  console.log(`[Token Check] ${providerId}: Refreshing token (${expiresInMinutes} minutes remaining)`);
  return refreshAndPersistGoogleToken(userId, providerId, token.refreshToken);
}

async function refreshAndPersistGoogleToken(
  userId: string,
  providerId: NonNullable<ReturnType<typeof getConnector>>["id"],
  refreshToken: string
) {
  try {
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
  } catch (error) {
    // If refresh token is expired, clear tokens and rethrow with clear message
    if (isRefreshTokenExpiredError(error)) {
      console.warn(`[Token Refresh] Refresh token expired for ${providerId}, clearing tokens for user ${userId}`);
      await deleteProviderToken(userId, providerId);
      throw new Error(`${getConnector(providerId)?.name ?? providerId} access has expired. Please reconnect this provider.`);
    }
    throw error;
  }
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

function isRefreshTokenExpiredError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("token has been expired or revoked") ||
    message.includes("invalid_grant") ||
    message.includes("refresh token") && message.includes("expired")
  );
}

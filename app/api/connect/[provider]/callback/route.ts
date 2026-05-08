import { NextRequest, NextResponse } from "next/server";
import { getConnector, resolveScopes } from "@/lib/connectors";
import { readOAuthState } from "@/lib/server/secure-store";
import { exchangeGoogleCode } from "@/lib/server/provider-sync";
import { requireUser } from "@/lib/server/auth";
import { readProviderCredentials, saveProviderToken } from "@/lib/server/provider-vault";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const user = await requireUser();
  const connector = getConnector(provider);

  if (!connector) {
    return NextResponse.json({ error: "Unknown connector provider." }, { status: 404 });
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = readOAuthState(request.nextUrl.searchParams.get("state"));

  if (!code || !state || state.providerId !== connector.id) {
    return NextResponse.redirect(
      new URL("/connect?connector_error=invalid_oauth_callback", request.url)
    );
  }

  const credentials = await readProviderCredentials(user.id);
  const redirectUri = `${request.nextUrl.origin}/api/connect/${connector.id}/callback`;

  try {
    const token = await exchangeGoogleCode({
      clientId: credentials.googleClientId ?? "",
      clientSecret: credentials.googleClientSecret ?? "",
      code,
      redirectUri
    });

    const grantedScopes = token.scope?.split(/[,\s]+/).filter(Boolean) ??
      resolveScopes(connector, state.options.accessMode);

    await saveProviderToken({
      grantedScopes,
      options: state.options,
      providerId: connector.id,
      token,
      userId: user.id
    });

    return NextResponse.redirect(
      new URL(`/connect?connected=${connector.id}`, request.url)
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "oauth_failed";
    return NextResponse.redirect(
      new URL(
        `/connect?connector_error=${encodeURIComponent(message)}`,
        request.url
      )
    );
  }
}

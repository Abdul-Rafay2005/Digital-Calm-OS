import { NextRequest, NextResponse } from "next/server";
import {
  createOAuthStartUrl,
  getConnector,
  type ConnectorSetupOptions
} from "@/lib/connectors";
import { createOAuthState } from "@/lib/server/secure-store";
import { requireUser } from "@/lib/server/auth";
import { readProviderCredentials } from "@/lib/server/provider-vault";

const fallbackOptions: ConnectorSetupOptions = {
  accessMode: "readonly",
  cadence: "hourly",
  resources: [],
  urgencyThreshold: 72,
  digestOnly: false
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const user = await requireUser();
  const connector = getConnector(provider);

  if (!connector) {
    return NextResponse.json({ error: "Unknown connector provider." }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as Partial<{
    options: ConnectorSetupOptions;
  }>;

  const options: ConnectorSetupOptions = {
    ...fallbackOptions,
    ...body.options,
    resources: body.options?.resources?.length
      ? body.options.resources
      : connector.resourceOptions.slice(0, 2)
  };

  const credentials = await readProviderCredentials(user.id);
  const state = createOAuthState({
    providerId: connector.id,
    options
  });
  const redirectBaseUrl = new URL(request.url).origin;
  const oauthUrl = createOAuthStartUrl(
    connector.id,
    redirectBaseUrl,
    state,
    credentials,
    options.accessMode
  );

  if (oauthUrl) {
    return NextResponse.json({
      mode: "oauth",
      provider: connector.name,
      oauthUrl,
      message: "Redirect the user to this URL to complete OAuth consent."
    });
  }

  return NextResponse.json({
    error:
      "Missing Google Client ID or Client Secret. Add them in Provider Credentials or environment variables."
  }, { status: 400 });
}

import { NextRequest, NextResponse } from "next/server";
import type { ProviderCredentials } from "@/lib/connectors";
import { requireUser } from "@/lib/server/auth";
import {
  readProviderCredentials,
  readStoredProviderCredentials,
  writeProviderCredentials
} from "@/lib/server/provider-vault";

export async function GET() {
  try {
    const user = await requireUser();
    const storedCredentials = await readStoredProviderCredentials(user.id);
    const credentials = await readProviderCredentials(user.id);

    return NextResponse.json({
      configured: {
        google: Boolean(storedCredentials.googleClientId && storedCredentials.googleClientSecret),
        googlePubsub: Boolean(storedCredentials.googlePubsubTopic),
        googleFallback: Boolean(
          !storedCredentials.googleClientId &&
            !storedCredentials.googleClientSecret &&
            credentials.googleClientId &&
            credentials.googleClientSecret
        )
      }
    });
  } catch {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = (await request.json().catch(() => ({}))) as ProviderCredentials;
    const existingCredentials = await readStoredProviderCredentials(user.id);

    const credentials: ProviderCredentials = {
      googleClientId: body.googleClientId?.trim() || existingCredentials.googleClientId,
      googleClientSecret: body.googleClientSecret?.trim() || existingCredentials.googleClientSecret,
      googlePubsubTopic: body.googlePubsubTopic?.trim() || existingCredentials.googlePubsubTopic
    };

    if (!credentials.googleClientId || !credentials.googleClientSecret) {
      return NextResponse.json(
        { error: "Google Client ID and Google Client Secret are required." },
        { status: 400 }
      );
    }

    await writeProviderCredentials(user.id, credentials);

    return NextResponse.json({
      ok: true,
      configured: {
        google: Boolean(credentials.googleClientId && credentials.googleClientSecret),
        googlePubsub: Boolean(credentials.googlePubsubTopic)
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save credentials." },
      { status: 401 }
    );
  }
}

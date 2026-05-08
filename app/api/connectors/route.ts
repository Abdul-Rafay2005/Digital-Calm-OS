import { NextResponse } from "next/server";
import { connectorRegistry } from "@/lib/connectors";
import { getCurrentUser } from "@/lib/server/auth";
import { readProviderCredentials } from "@/lib/server/provider-vault";

export async function GET() {
  const user = await getCurrentUser();
  const credentials = user ? await readProviderCredentials(user.id) : {};

  return NextResponse.json({
    connectors: connectorRegistry.map((connector) => {
      return {
        ...connector,
        configured: Boolean(credentials.googleClientId && credentials.googleClientSecret)
      };
    })
  });
}

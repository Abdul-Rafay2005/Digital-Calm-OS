import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getConnector } from "@/lib/connectors";
import { requireUser } from "@/lib/server/auth";
import { deleteConnection, readConnections } from "@/lib/server/provider-vault";

export async function GET() {
  try {
    const user = await requireUser();
    const connections = await readConnections(user.id);

    return NextResponse.json({ connections });
  } catch {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await requireUser();
  const provider = request.nextUrl.searchParams.get("provider");
  const connector = provider ? getConnector(provider) : null;

  if (!connector) {
    return NextResponse.json({ error: "Unknown connector provider." }, { status: 404 });
  }

  await deleteConnection(user.id, connector.id);

  return NextResponse.json({ ok: true });
}

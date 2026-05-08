import { NextRequest, NextResponse } from "next/server";
import { normalizeEmail, verifyEmailCode } from "@/lib/server/auth";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      code?: string;
      email?: string;
      name?: string;
    };
    const email = normalizeEmail(body.email ?? "");

    if (!email || !body.code) {
      return NextResponse.json({ error: "Email and code are required." }, { status: 400 });
    }

    const user = await verifyEmailCode(email, body.code, body.name);

    return NextResponse.json({
      ok: true,
      user
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Verification failed." },
      { status: 400 }
    );
  }
}

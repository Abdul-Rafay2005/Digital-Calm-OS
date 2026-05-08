import { NextRequest, NextResponse } from "next/server";
import { createVerificationCode, normalizeEmail } from "@/lib/server/auth";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      email?: string;
      mode?: "signup" | "login";
    };
    const email = normalizeEmail(body.email ?? "");

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }

    await createVerificationCode(email, body.mode === "login" ? "login" : "signup");

    return NextResponse.json({
      ok: true,
      message: "Verification code sent."
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send verification code." },
      { status: 500 }
    );
  }
}

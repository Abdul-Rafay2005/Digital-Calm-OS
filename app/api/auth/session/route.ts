import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      {
        user: null,
        error: error instanceof Error ? error.message : "Session lookup failed."
      },
      { status: 500 }
    );
  }
}

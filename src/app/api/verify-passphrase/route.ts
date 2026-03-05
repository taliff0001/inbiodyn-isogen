import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/verify-passphrase
 *
 * Checks if the provided passphrase matches the server-side secret.
 * Used by the client to gate access to the app.
 */
export async function POST(req: NextRequest) {
  try {
    const { passphrase } = await req.json();
    const expected = process.env.APP_PASSPHRASE;

    if (!expected) {
      return NextResponse.json({ error: "Not configured" }, { status: 500 });
    }

    return NextResponse.json({ valid: passphrase === expected.trim() });
  } catch {
    return NextResponse.json({ valid: false });
  }
}

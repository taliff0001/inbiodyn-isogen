import { NextRequest, NextResponse } from "next/server";

/**
 * Verifies the app passphrase from a request header.
 * Returns null if valid, or a NextResponse error if invalid.
 */
export function verifyPassphrase(req: NextRequest): NextResponse | null {
  const passphrase = req.headers.get("x-app-passphrase");
  const expected = process.env.APP_PASSPHRASE;

  if (!expected) {
    return NextResponse.json(
      { error: "App passphrase not configured on server" },
      { status: 500 }
    );
  }

  if (!passphrase || passphrase !== expected.trim()) {
    return NextResponse.json(
      { error: "Invalid passphrase" },
      { status: 401 }
    );
  }

  return null; // Valid
}
